"use client";

import { useState } from "react";
import type { FetchedMetadata, Item } from "@/lib/types";
import { useStore } from "@/lib/store";
import type { Prefill } from "@/lib/capture";
import { formatLoggedDate, todayISODate } from "@/lib/format";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import ScoreSlider from "./ScoreSlider";
import { FlagIcon, ImageIcon, LinkIcon, PlusIcon, SpinnerIcon } from "./icons";

const inputCls =
  "w-full rounded-control border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none";
const labelCls = "block text-sm font-medium text-ink-soft mb-1.5";

type FetchState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; ok: boolean; message: string; blocked?: boolean };

export default function ItemForm({
  existing,
  prefill,
  onClose,
}: {
  existing?: Item;
  /** Values captured by the bookmarklet — the add form opens already filled. */
  prefill?: Prefill;
  onClose: () => void;
}) {
  const { categories, addItem, updateItem, deleteItem, addCategory } =
    useStore();
  const isEdit = Boolean(existing);

  const [url, setUrl] = useState(existing?.url ?? prefill?.url ?? "");
  const [name, setName] = useState(existing?.name ?? prefill?.name ?? "");
  const [brand, setBrand] = useState(existing?.brand ?? prefill?.brand ?? "");
  const [imageUrl, setImageUrl] = useState(
    existing?.imageUrl ?? prefill?.imageUrl ?? ""
  );
  const [price, setPrice] = useState(
    existing?.price != null
      ? String(existing.price)
      : prefill?.price != null
      ? String(prefill.price)
      : ""
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    existing?.categoryIds ?? []
  );
  const [desire, setDesire] = useState(existing?.desire ?? 5);
  const [note, setNote] = useState(existing?.note ?? "");
  const [flagNote, setFlagNote] = useState(existing?.flagNote ?? "");
  const [loggedAt, setLoggedAt] = useState(
    existing?.loggedAt ?? todayISODate()
  );

  const [fetchState, setFetchState] = useState<FetchState>(
    prefill
      ? {
          phase: "done",
          ok: prefill.ok,
          message: prefill.message ?? "Filled from the page you were on.",
        }
      : { phase: "idle" }
  );
  const [newCategory, setNewCategory] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleFetch() {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setFetchState({
        phase: "done",
        ok: false,
        message: "Add a full http(s):// link first.",
      });
      return;
    }
    setFetchState({ phase: "loading" });
    try {
      const res = await fetch("/api/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await res.json()) as FetchedMetadata;
      // Fill only fields the user hasn't already typed — never clobber edits.
      if (data.name && !name.trim()) setName(data.name);
      if (data.brand && !brand.trim()) setBrand(data.brand);
      if (data.imageUrl && !imageUrl.trim()) setImageUrl(data.imageUrl);
      if (data.price != null && !price.trim()) setPrice(String(data.price));
      setFetchState({
        phase: "done",
        ok: data.ok,
        message:
          data.message ??
          (data.ok ? "Filled what we could find." : "Nothing found."),
        blocked: data.blocked,
      });
    } catch {
      setFetchState({
        phase: "done",
        ok: false,
        message: "Couldn't reach the fetch service. Enter details by hand.",
      });
    }
  }

  function toggleCategory(id: string) {
    setCategoryIds((ids) =>
      ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]
    );
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const existingCat = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    const cat = existingCat ?? addCategory(trimmed);
    if (!categoryIds.includes(cat.id)) setCategoryIds((ids) => [...ids, cat.id]);
    setNewCategory("");
  }

  function handleSave() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setUrlError("A product link is required.");
      return;
    }
    const parsedPrice =
      price.trim() === "" ? null : Number(price.replace(/[^\d.]/g, ""));
    const payload = {
      url: trimmedUrl,
      name,
      brand,
      imageUrl,
      price: parsedPrice != null && Number.isFinite(parsedPrice) ? parsedPrice : null,
      categoryIds,
      desire,
      note,
      flagNote: flagNote.trim() || undefined,
      loggedAt,
    };
    if (existing) updateItem(existing.id, payload);
    else addItem(payload);
    onClose();
  }

  return (
    <>
    <Modal
      title={isEdit ? "Edit item" : "Add an item"}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          {isEdit ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm font-medium text-danger transition-colors hover:text-danger-hover"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-control px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-control bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
            >
              {isEdit ? "Save changes" : "Add to list"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* URL + fetch */}
        <div>
          <label htmlFor="item-url" className={labelCls}>
            Product link <span className="text-ink-muted">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                id="item-url"
                className={`${inputCls} pl-9`}
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleFetch}
              disabled={fetchState.phase === "loading"}
              className="flex shrink-0 items-center gap-1.5 rounded-control border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken disabled:opacity-60"
            >
              {fetchState.phase === "loading" ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : null}
              {fetchState.phase === "loading" ? "Fetching" : "Fetch details"}
            </button>
          </div>
          {urlError ? (
            <p className="mt-1.5 text-meta font-medium text-ink">{urlError}</p>
          ) : null}
          {fetchState.phase === "done" ? (
            <p className="mt-1.5 text-meta text-ink-muted">
              {fetchState.message} Have a look and tweak anything below.
              {fetchState.blocked ? (
                <>
                  {" "}
                  For the price and image,{" "}
                  <a
                    href="/bookmarklet"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    set up the Linger bookmarklet
                  </a>{" "}
                  — it reads the page from your own browser.
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1.5 text-meta text-ink-faint">
              Paste a link and I&rsquo;ll try to fill in the details for you.
              Some shops block this — for those, the{" "}
              <a
                href="/bookmarklet"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-ink-muted"
              >
                bookmarklet
              </a>{" "}
              grabs everything from your own browser, or just type things in.
            </p>
          )}
        </div>

        {/* Image preview + url */}
        <div className="flex gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface-sunken">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-contain p-1.5"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility =
                    "hidden";
                }}
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-ink-faint" />
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="item-image" className={labelCls}>
              Image URL
            </label>
            <input
              id="item-image"
              className={inputCls}
              type="url"
              placeholder="https://…/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Name + brand */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="item-name" className={labelCls}>
              Name
            </label>
            <input
              id="item-name"
              className={inputCls}
              placeholder="What is it?"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="item-brand" className={labelCls}>
              Brand
            </label>
            <input
              id="item-brand"
              className={inputCls}
              placeholder="Maker or shop"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>
        </div>

        {/* Price + logged date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="item-price" className={labelCls}>
              Price (£)
            </label>
            <input
              id="item-price"
              className={inputCls}
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="item-date" className={labelCls}>
              Date logged
            </label>
            <input
              id="item-date"
              className={inputCls}
              type="date"
              value={loggedAt}
              max={todayISODate()}
              onChange={(e) => setLoggedAt(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <span className={labelCls}>Categories</span>
          <p className="-mt-1 mb-2 text-meta text-ink-faint">
            Pick one or more. The first you pick is the primary, shown on the
            card.
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const selected = categoryIds.includes(cat.id);
              const isPrimary = categoryIds[0] === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={
                    selected
                      ? "rounded-full border border-ink bg-ink px-3 py-1 text-meta font-medium text-white"
                      : "rounded-full border border-line-strong px-3 py-1 text-meta text-ink-soft transition-colors hover:border-ink-muted"
                  }
                >
                  {cat.name}
                  {isPrimary ? (
                    <span className="ml-1 opacity-70">· primary</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder="New category…"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex shrink-0 items-center gap-1 rounded-control border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Desire */}
        <div className="rounded-control bg-surface-page p-4">
          <ScoreSlider
            label="How much do you want it now?"
            value={desire}
            onChange={setDesire}
          />
        </div>

        {/* Note */}
        <div>
          <label htmlFor="item-note" className={labelCls}>
            Why do you want it?{" "}
            <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <textarea
            id="item-note"
            className={`${inputCls} min-h-[72px] resize-y`}
            placeholder="A line for future-you, reflecting on this want…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Flag — for time-sensitive things (ticket dates, deadlines, sales). */}
        <div>
          <label htmlFor="item-flag" className={labelCls}>
            <span className="inline-flex items-center gap-1.5">
              <FlagIcon className="h-3.5 w-3.5 text-flag" />
              Flag
            </span>{" "}
            <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id="item-flag"
            className={inputCls}
            placeholder="Anything time-sensitive — e.g. concert on 14 Aug, sale ends Friday"
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
          />
        </div>

        {/* Status context — actions (buy / let go / move back) live on the
            cards themselves now, so editing stays focused on the details. */}
        {existing && existing.status !== "active" ? (
          <p className="text-meta text-ink-faint">
            {existing.status === "bought"
              ? `Bought ${
                  existing.boughtAt ? formatLoggedDate(existing.boughtAt) : ""
                }`
              : `Let go ${
                  existing.archivedAt
                    ? formatLoggedDate(existing.archivedAt)
                    : ""
                }`}
          </p>
        ) : null}
      </div>
    </Modal>
    {confirmingDelete && existing ? (
      <ConfirmDialog
        title="Delete this item?"
        message="This permanently removes it — it won't move to Let go. To set it aside instead, use Let go."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteItem(existing.id);
          setConfirmingDelete(false);
          onClose();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    ) : null}
    </>
  );
}
