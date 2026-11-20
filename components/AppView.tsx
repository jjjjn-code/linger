"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Item, PersistedState } from "@/lib/types";
import { todayISODate } from "@/lib/format";
import { usePersistentState } from "@/lib/usePersistentState";
import {
  DEFAULT_DIR,
  SORT_LABELS,
  SORT_ORDER,
  sortItems,
  type SortDir,
  type SortKey,
} from "@/lib/sort";
import { orderByRank } from "@/lib/rank";
import { readCaptureFromHash, type Prefill } from "@/lib/capture";
import ItemCard from "./ItemCard";
import ItemListRow from "./ItemListRow";
import BoughtCard from "./BoughtCard";
import RankableList from "./RankableList";
import DashboardView from "./DashboardView";
import ItemForm from "./ItemForm";
import DetailModal from "./DetailModal";
import LetGoDialog from "./LetGoDialog";
import CategoryManager from "./CategoryManager";
import CategoryFilter from "./CategoryFilter";
import LoginScreen from "./LoginScreen";
import { DragHandleIcon, LingerMark, PlusIcon } from "./icons";

type Editing =
  | { mode: "add"; prefill?: Prefill }
  | { mode: "edit"; item: Item }
  | null;
type Layout = "cards" | "list";
type Section = "considering" | "bought" | "letgo" | "dashboard";

export default function AppView() {
  const {
    ready,
    authStatus,
    apiMode,
    items,
    letGo,
    restore,
    signOut,
    replaceAll,
    snapshot,
  } = useStore();
  const [editing, setEditing] = useState<Editing>(null);

  // Bookmarklet hand-off: the page you were on arrives in the URL fragment
  // (never sent to a server). Read it once, clear it from the address bar, and
  // hold it until the list has loaded — in hosted mode that's after sign-in.
  const [capture, setCapture] = useState<Prefill | null>(null);
  useEffect(() => {
    const found = readCaptureFromHash(window.location.hash);
    if (window.location.hash.startsWith("#linger=")) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
    if (found) setCapture(found);
  }, []);
  useEffect(() => {
    if (!capture || !ready) return;
    setEditing({ mode: "add", prefill: capture });
    setCapture(null);
  }, [capture, ready]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [layout, setLayout] = usePersistentState<Layout>(
    "considered.layout.v1",
    "cards"
  );
  const [sort, setSort] = usePersistentState<SortKey>(
    "considered.sort.v1",
    "date"
  );
  const [dir, setDir] = usePersistentState<SortDir>(
    "considered.dir.v1",
    "desc"
  );
  const [rankOrder, setRankOrder] = usePersistentState<string[]>(
    "considered.rankOrder.v1",
    []
  );
  // Rank mode is a session toggle — reloading returns you to sorting.
  const [rankMode, setRankMode] = useState(false);
  const [section, setSection] = useState<Section>("considering");
  // The read-only detail modal; focusPurchase jumps to the buy section.
  const [viewing, setViewing] = useState<{
    item: Item;
    focusPurchase: boolean;
  } | null>(null);
  const [confirmingLetGo, setConfirmingLetGo] = useState<Item | null>(null);

  const openEdit = (it: Item) => setEditing({ mode: "edit", item: it });

  // --- Export / Import: a portable backup of the whole dataset. --------------
  function exportData() {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linger-export-${todayISODate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as PersistedState;
      if (!parsed || !Array.isArray(parsed.items)) {
        alert("That file doesn't look like a Linger export.");
        return;
      }
      if (
        items.length > 0 &&
        !confirm(
          "Importing replaces everything currently on your list. Continue?"
        )
      ) {
        return;
      }
      replaceAll(parsed);
    } catch {
      alert("Couldn't read that file — is it a valid Linger export?");
    }
  }

  // Cards and rows only open the detail view or jump to the buy decision.
  const actions = useMemo(
    () => ({
      onView: (it: Item) => setViewing({ item: it, focusPurchase: false }),
      onBuy: (it: Item) => setViewing({ item: it, focusPurchase: true }),
    }),
    []
  );

  // Let go is guarded by a confirmation step.
  const requestLetGo = (it: Item) => setConfirmingLetGo(it);

  function goTo(next: Section) {
    setSection(next);
    if (next !== "considering") setRankMode(false);
  }

  const activeItems = useMemo(
    () => items.filter((it) => it.status === "active"),
    [items]
  );

  // Resolved shelves, newest resolution first.
  const boughtItems = useMemo(
    () =>
      items
        .filter((it) => it.status === "bought")
        .sort((a, b) => (b.boughtAt ?? "").localeCompare(a.boughtAt ?? "")),
    [items]
  );
  const letGoItems = useMemo(
    () =>
      items
        .filter((it) => it.status === "archived")
        .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? "")),
    [items]
  );

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const it of activeItems) {
      for (const id of it.categoryIds) {
        byCategory[id] = (byCategory[id] ?? 0) + 1;
      }
    }
    return { all: activeItems.length, byCategory };
  }, [activeItems]);

  const visible = useMemo(() => {
    const filtered =
      activeCategory === null
        ? activeItems
        : activeItems.filter((it) => it.categoryIds.includes(activeCategory));
    return sortItems(filtered, sort, dir);
  }, [activeItems, activeCategory, sort, dir]);

  // Rank mode ranks ALL active items (a partial order within a filter would be
  // ambiguous to save), seeded by desire order until you start dragging.
  const rankedItems = useMemo(
    () => orderByRank(activeItems, rankOrder),
    [activeItems, rankOrder]
  );

  function chooseSort(key: SortKey) {
    // Picking a new sort resets to its natural direction; re-picking flips it.
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(DEFAULT_DIR[key]);
    }
  }

  const renderCollection = (list: Item[]) =>
    layout === "cards" ? (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {list.map((item) => (
          <ItemCard key={item.id} item={item} {...actions} />
        ))}
      </div>
    ) : (
      <ol className="space-y-2.5">
        {list.map((item) => (
          <ItemListRow key={item.id} item={item} {...actions} />
        ))}
      </ol>
    );

  const renderBought = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {boughtItems.map((item) => (
        <BoughtCard key={item.id} item={item} onEdit={openEdit} />
      ))}
    </div>
  );

  // In hosted (API) mode, hold everything behind the passphrase gate until the
  // session is established. localStorage mode skips this entirely.
  if (apiMode && authStatus === "needs-auth") {
    return <LoginScreen />;
  }
  if (apiMode && authStatus === "loading") {
    return (
      <div className="mx-auto flex min-h-screen max-w-shell items-center justify-center px-5">
        <p className="font-mono text-meta text-ink-faint">Opening your list…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-shell px-5 pb-24 sm:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-10 sm:pt-14">
        <div>
          <p className="font-mono text-[0.8125rem] text-ink-faint">
            Some wants last, Most don&rsquo;t
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-surface">
              <LingerMark className="h-[18px] w-auto" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Linger
            </h1>
          </div>
          <p className="mt-1.5 max-w-md text-sm text-ink-muted">
            The wants that linger are the ones worth keeping. Log a want, let it
            sit, and see if it lasts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ mode: "add" })}
          className="flex items-center gap-1.5 rounded-control bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
        >
          <PlusIcon className="h-4 w-4" />
          Add item
        </button>
      </header>

      {ready && items.length > 0 ? (
        <>
          {/* Primary section nav */}
          <nav className="mt-8 flex gap-4 overflow-x-auto border-b border-line sm:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavItem
              label="Considering"
              count={activeItems.length}
              active={section === "considering"}
              onClick={() => goTo("considering")}
            />
            <NavItem
              label="Bought"
              count={boughtItems.length}
              active={section === "bought"}
              onClick={() => goTo("bought")}
            />
            <NavItem
              label="Let go"
              count={letGoItems.length}
              active={section === "letgo"}
              onClick={() => goTo("letgo")}
            />
            <NavItem
              label="Dashboard"
              active={section === "dashboard"}
              onClick={() => goTo("dashboard")}
            />
          </nav>

          {/* Considering controls: filter + layout/sort/rank */}
          {section === "considering" && activeItems.length > 0 ? (
            <>
              {!rankMode ? (
                <div className="mt-6">
                  <CategoryFilter
                    active={activeCategory}
                    onChange={setActiveCategory}
                    counts={counts}
                    onManage={() => setShowCategories(true)}
                  />
                </div>
              ) : null}
              <div
                className={
                  "flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 " +
                  (rankMode ? "mt-6" : "mt-5")
                }
              >
                <LayoutToggle
                  layout={layout}
                  onChange={(l) => {
                    setLayout(l);
                    if (l === "cards") setRankMode(false);
                  }}
                />
                <div className="flex items-center gap-2">
                  {!rankMode ? (
                    <SortControl
                      sort={sort}
                      dir={dir}
                      onChoose={chooseSort}
                      onToggleDir={() =>
                        setDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                    />
                  ) : null}
                  {layout === "list" ? (
                    <RankToggle
                      on={rankMode}
                      onClick={() => {
                        setRankMode((r) => !r);
                        setActiveCategory(null);
                      }}
                    />
                  ) : null}
                </div>
              </div>
              {rankMode ? (
                <p className="mt-4 text-meta text-ink-muted">
                  Drag the <span className="text-ink">≡</span> handles into your
                  true order of wanting — most wanted at the top.
                </p>
              ) : null}
            </>
          ) : null}

          {/* Let-go shelf: a quiet layout toggle. (Bought uses rich detail cards.) */}
          {section === "letgo" && letGoItems.length > 0 ? (
            <div className="mt-5 flex border-b border-line pb-4">
              <LayoutToggle layout={layout} onChange={setLayout} />
            </div>
          ) : null}
        </>
      ) : null}

      {/* Body */}
      <main className={rankMode ? "mt-4" : "mt-8"}>
        {!ready ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState onAdd={() => setEditing({ mode: "add" })} />
        ) : section === "dashboard" ? (
          <DashboardView />
        ) : section === "bought" ? (
          boughtItems.length === 0 ? (
            <EmptyShelf text="Nothing bought yet. When you buy something you've been considering, it comes to rest here." />
          ) : (
            renderBought()
          )
        ) : section === "letgo" ? (
          letGoItems.length === 0 ? (
            <EmptyShelf text="Nothing let go yet. Wants you change your mind about gather here — proof that waiting works." />
          ) : (
            renderCollection(letGoItems)
          )
        ) : activeItems.length === 0 ? (
          <EmptyShelf text="Nothing in your considering list right now. Add something, or revisit what you've bought or let go." />
        ) : rankMode ? (
          <RankableList
            items={rankedItems}
            onReorder={setRankOrder}
            actions={actions}
          />
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-muted">
            Nothing in this category yet.
          </p>
        ) : (
          renderCollection(visible)
        )}
      </main>

      {/* Quiet technical caption — brand voice + data controls. */}
      {ready ? (
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-5 font-mono text-meta text-ink-faint">
          <span>Linger</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={exportData}
              className="transition-colors hover:text-ink"
            >
              Export
            </button>
            <a href="/bookmarklet" className="transition-colors hover:text-ink">
              Bookmarklet
            </a>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="transition-colors hover:text-ink"
            >
              Import
            </button>
            {apiMode ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="transition-colors hover:text-ink"
              >
                Sign out
              </button>
            ) : null}
            <span className="text-ink-faint/70">Wants worth keeping</span>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = "";
            }}
          />
        </footer>
      ) : null}

      {/* Modals */}
      {editing?.mode === "add" ? (
        <ItemForm prefill={editing.prefill} onClose={() => setEditing(null)} />
      ) : null}
      {editing?.mode === "edit" ? (
        <ItemForm existing={editing.item} onClose={() => setEditing(null)} />
      ) : null}
      {showCategories ? (
        <CategoryManager onClose={() => setShowCategories(false)} />
      ) : null}
      {viewing ? (
        <DetailModal
          item={viewing.item}
          focusPurchase={viewing.focusPurchase}
          onClose={() => setViewing(null)}
          onEdit={(it) => {
            setViewing(null);
            openEdit(it);
          }}
          onLetGo={requestLetGo}
          onRestore={(it) => {
            restore(it.id);
            setViewing(null);
          }}
        />
      ) : null}
      {confirmingLetGo ? (
        <LetGoDialog
          itemName={confirmingLetGo.name}
          onConfirm={(reasons) => {
            letGo(confirmingLetGo.id, reasons);
            setConfirmingLetGo(null);
            setViewing(null);
          }}
          onCancel={() => setConfirmingLetGo(null)}
        />
      ) : null}
    </div>
  );
}

function LayoutToggle({
  layout,
  onChange,
}: {
  layout: Layout;
  onChange: (l: Layout) => void;
}) {
  const tab = (key: Layout, label: string) => (
    <button
      type="button"
      onClick={() => onChange(key)}
      className={
        "rounded-[7px] px-3 py-1 text-sm font-medium transition-colors " +
        (layout === key
          ? "bg-surface text-ink shadow-soft"
          : "text-ink-muted hover:text-ink")
      }
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-1 rounded-control bg-surface-sunken p-1">
      {tab("cards", "Cards")}
      {tab("list", "List")}
    </div>
  );
}

function NavItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        "relative -mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors " +
        (active
          ? "border-ink text-ink"
          : "border-transparent text-ink-muted hover:text-ink-soft")
      }
    >
      {label}
      {count != null ? (
        <span className="ml-1.5 font-mono tabular-nums text-ink-faint">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function EmptyShelf({ text }: { text: string }) {
  return (
    <p className="mx-auto max-w-sm rounded-card border border-dashed border-line-strong px-8 py-14 text-center text-sm text-ink-muted">
      {text}
    </p>
  );
}

function RankToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={
        "flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium transition-colors " +
        (on
          ? "bg-ink text-white hover:bg-ink-soft"
          : "border border-line-strong text-ink-soft hover:border-ink-muted")
      }
    >
      <DragHandleIcon className="h-4 w-4" />
      {on ? "Done" : "Rank"}
    </button>
  );
}

function SortControl({
  sort,
  dir,
  onChoose,
  onToggleDir,
}: {
  sort: SortKey;
  dir: SortDir;
  onChoose: (key: SortKey) => void;
  onToggleDir: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-label uppercase text-ink-faint">Sort</span>
      <select
        value={sort}
        onChange={(e) => onChoose(e.target.value as SortKey)}
        className="rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none"
        aria-label="Sort items by"
      >
        {SORT_ORDER.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleDir}
        className="flex items-center gap-1 rounded-control border border-line-strong px-2.5 py-1.5 text-meta text-ink-soft transition-colors hover:border-ink-muted"
        aria-label={`Sort ${dir === "asc" ? "ascending" : "descending"}`}
      >
        {dir === "asc" ? "Asc" : "Desc"}
        <span aria-hidden className="text-ink-faint">
          {dir === "asc" ? "↑" : "↓"}
        </span>
      </button>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="glow-accent mx-auto max-w-sm rounded-card border border-dashed border-line-strong bg-surface/40 px-8 py-16 text-center">
      <p className="font-mono text-label uppercase text-ink-faint">
        Nothing on the list yet
      </p>
      <h2 className="mt-2 text-base font-semibold text-ink">
        Your list is empty
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-muted">
        Add the first thing you&rsquo;re thinking about buying. There&rsquo;s no
        rush — letting it sit here is the whole point.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-1.5 rounded-control bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
      >
        <PlusIcon className="h-4 w-4" />
        Add your first item
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-card border border-line bg-surface"
        >
          <div className="aspect-[16/10] animate-pulse bg-surface-sunken" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-sunken" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-sunken" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}
