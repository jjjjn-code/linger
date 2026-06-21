"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  daysBetween,
  formatLoggedDate,
  formatPrice,
  todayISODate,
} from "@/lib/format";
import { ExternalLinkIcon, ImageIcon } from "./icons";
import Menu from "./Menu";

const REFLECT_AFTER_DAYS = 30;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-label uppercase text-ink-faint">{label}</div>
      <div className="mt-0.5 text-sm text-ink-soft">{children}</div>
    </div>
  );
}

export default function BoughtCard({
  item,
  onEdit,
}: {
  item: Item;
  onEdit: (item: Item) => void;
}) {
  const { categoryName, restore, updateItem } = useStore();
  const [draft, setDraft] = useState("");

  // Reflections, oldest first. Migrate any legacy single note into one entry.
  const entries =
    item.postPurchaseLog ??
    (item.postPurchaseNote
      ? [{ at: item.boughtAt ?? item.loggedAt, text: item.postPurchaseNote }]
      : []);

  const waited =
    item.boughtAt != null ? daysBetween(item.loggedAt, item.boughtAt) : null;
  const sinceBought =
    item.boughtAt != null ? daysBetween(item.boughtAt, todayISODate()) : 0;
  const promptReflection =
    sinceBought >= REFLECT_AFTER_DAYS && entries.length === 0;

  function logUpdate() {
    const text = draft.trim();
    if (!text) return;
    updateItem(item.id, {
      postPurchaseLog: [...entries, { at: todayISODate(), text }],
      postPurchaseNote: undefined,
    });
    setDraft("");
  }

  return (
    <article className="relative flex flex-col rounded-card border border-line bg-surface shadow-soft">
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-card bg-surface-sunken">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="absolute right-2 top-2 rounded-control bg-surface/85 p-0.5 shadow-soft backdrop-blur-sm">
        <Menu
          actions={[
            { label: "Edit", onSelect: () => onEdit(item) },
            {
              label: "Move back to considering",
              onSelect: () => restore(item.id),
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-[0.9375rem] font-semibold leading-tight text-ink">
              {item.name || "Untitled item"}
            </h3>
            <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-ink">
              {formatPrice(item.price)}
            </span>
          </div>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-meta font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              View product page
            </a>
          ) : null}
        </div>

        {/* Purchase facts */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Detail label="Bought">
            {item.boughtAt ? formatLoggedDate(item.boughtAt) : "—"}
          </Detail>
          <Detail label="Waited">
            {waited != null ? `${waited} day${waited === 1 ? "" : "s"}` : "—"}
          </Detail>
          <Detail label="Desire">{item.desire}/10</Detail>
          <Detail label="Brand">{item.brand || "—"}</Detail>
        </div>

        {item.note ? (
          <Detail label="Why you wanted it">
            <span className="text-ink-muted">{item.note}</span>
          </Detail>
        ) : null}

        {item.purchaseReason ? (
          <Detail label="Why you bought it">{item.purchaseReason}</Detail>
        ) : null}

        {/* Post-purchase reflection — a running log you add to over time. */}
        <div className="rounded-control bg-surface-page p-3">
          {promptReflection ? (
            <p className="mb-3 text-meta font-medium text-ink">
              It&rsquo;s been {sinceBought} days — how do you feel about this
              purchase?
            </p>
          ) : (
            <div className="mb-3 font-mono text-label uppercase text-ink-faint">
              How do you feel about it now?
            </div>
          )}

          {entries.length > 0 ? (
            <ul className="mb-3 space-y-2.5">
              {entries.map((e, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <div className="font-mono text-label uppercase text-ink-faint">
                    {e.at ? formatLoggedDate(e.at) : ""}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-soft">{e.text}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <textarea
            id={`reflect-${item.id}`}
            className="min-h-[56px] w-full resize-y rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            placeholder={
              entries.length > 0
                ? "How do you feel about it now?"
                : "Worth it? Still using it? A note to your future self…"
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            onClick={logUpdate}
            disabled={!draft.trim()}
            className="mt-2 rounded-control bg-ink px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-ink/40"
          >
            {entries.length > 0 ? "Log an update" : "Log it"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.categoryIds.map((id) => (
            <span
              key={id}
              className="rounded-full border border-line bg-surface-page px-2 py-0.5 text-meta text-ink-soft"
            >
              {categoryName(id)}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
