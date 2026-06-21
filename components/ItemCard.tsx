"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";
import { useStore } from "@/lib/store";
import { daysOnListLabel, formatLoggedDate, formatPrice } from "@/lib/format";
import {
  ChevronDownIcon,
  FlagIcon,
  ImageIcon,
  ShoppingCartIcon,
} from "./icons";

/** Status-aware meta: time waiting while active, resolution date once resolved. */
function statusMeta(item: Item): string {
  if (item.status === "archived" && item.archivedAt) {
    return `Let go ${formatLoggedDate(item.archivedAt)}`;
  }
  return `${daysOnListLabel(item.loggedAt)} on list`;
}

export default function ItemCard({
  item,
  onView,
  onBuy,
}: {
  item: Item;
  onView: (item: Item) => void;
  onBuy: (item: Item) => void;
}) {
  const { categoryName } = useStore();
  const [expanded, setExpanded] = useState(false);
  const isActive = item.status === "active";

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`View details for ${item.name || "item"}`}
      onClick={() => onView(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(item);
        }
      }}
      className="group flex cursor-pointer flex-col rounded-card border border-line bg-surface text-left shadow-soft transition-colors hover:border-line-strong focus-visible:border-ink"
    >
      {/* Image */}
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

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[0.9375rem] font-semibold leading-tight text-ink">
            {item.name || "Untitled item"}
          </h3>
          <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-ink">
            {formatPrice(item.price)}
          </span>
        </div>
        <p className="mt-1 truncate text-meta text-ink-muted">
          {item.brand || "No brand"} ·{" "}
          <span className="font-mono">{statusMeta(item)}</span>
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.categoryIds.length > 0 ? (
            item.categoryIds.map((id) => (
              <span
                key={id}
                className="rounded-full border border-line bg-surface-page px-2 py-0.5 text-meta text-ink-soft"
              >
                {categoryName(id)}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-dashed border-line px-2 py-0.5 text-meta text-ink-faint">
              Uncategorised
            </span>
          )}
        </div>

        {item.flagNote ? (
          <div className="mt-2 flex items-start gap-1.5 rounded-control bg-flag-soft px-2.5 py-1.5">
            <FlagIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-flag" />
            <span className="text-meta leading-snug text-flag">
              {item.flagNote}
            </span>
          </div>
        ) : null}

        {item.note ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="mt-2 flex w-full items-start gap-1.5 text-left"
            aria-expanded={expanded}
          >
            <span
              className={
                "flex-1 text-meta leading-snug text-ink-muted " +
                (expanded ? "" : "line-clamp-1")
              }
            >
              {item.note}
            </span>
            <ChevronDownIcon
              className={
                "mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform " +
                (expanded ? "rotate-180" : "")
              }
            />
          </button>
        ) : null}

        {/* Footer: Desire + the prominent buy action, with the metadata. */}
        <div className="mt-auto flex items-center gap-3 border-t border-line pt-3">
          <span className="font-mono text-label uppercase text-ink-faint">
            Desire
          </span>
          <div className="h-1 flex-1 rounded-full bg-line">
            <div
              className="h-1 rounded-full bg-ink-soft"
              style={{ width: `${(item.desire / 10) * 100}%` }}
            />
          </div>
          <span className="font-mono text-sm tabular-nums font-medium text-ink-soft">
            {item.desire}
          </span>
          {isActive ? (
            <button
              type="button"
              aria-label="Decide to buy"
              title="Decide to buy"
              onClick={(e) => {
                e.stopPropagation();
                onBuy(item);
              }}
              className="-my-1 ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line-strong text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-white"
            >
              <ShoppingCartIcon className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
