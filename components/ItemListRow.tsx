"use client";

import type { CSSProperties } from "react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { Item } from "@/lib/types";
import { useStore } from "@/lib/store";
import { daysOnListLabel, formatLoggedDate, formatPrice } from "@/lib/format";
import {
  DragHandleIcon,
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

interface RankProps {
  setNodeRef: (el: HTMLElement | null) => void;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
}

export default function ItemListRow({
  item,
  onView,
  onBuy,
  rank,
}: {
  item: Item;
  onView: (item: Item) => void;
  onBuy: (item: Item) => void;
  rank?: RankProps;
}) {
  const { categoryName } = useStore();
  const isActive = item.status === "active";

  return (
    <li
      ref={rank?.setNodeRef}
      style={rank?.style}
      className={
        "flex items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors hover:border-line-strong sm:gap-4 sm:p-4 " +
        (rank?.isDragging ? "relative z-10 opacity-90 shadow-lift" : "")
      }
    >
      {rank ? (
        <button
          ref={rank.setActivatorNodeRef}
          type="button"
          aria-label={`Drag ${item.name || "item"} to reorder`}
          {...rank.attributes}
          {...rank.listeners}
          className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-ink-faint transition-colors hover:text-ink-muted active:cursor-grabbing"
        >
          <DragHandleIcon className="h-5 w-5" />
        </button>
      ) : null}

      {/* Body — opens the read-only detail view. */}
      <button
        type="button"
        onClick={() => onView(item)}
        aria-label={`View details for ${item.name || "item"}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none sm:gap-4"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken sm:h-16 sm:w-16">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-contain p-1.5"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-ink-faint" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink sm:text-base">
            {item.name || "Untitled item"}
          </h3>
          <p className="mt-0.5 truncate text-meta text-ink-muted">
            {item.brand || "No brand"}
            {item.categoryIds.length > 0
              ? " · " + item.categoryIds.map(categoryName).join(", ")
              : ""}
          </p>
          <p className="mt-1 truncate font-mono text-meta text-ink-faint">
            {statusMeta(item)}
          </p>
          {item.flagNote ? (
            <p className="mt-1 flex items-center gap-1 truncate text-meta text-flag">
              <FlagIcon className="h-3 w-3 shrink-0" />
              {item.flagNote}
            </p>
          ) : null}
        </div>
      </button>

      {/* Desire — hidden on the narrowest screens. */}
      <div className="hidden shrink-0 text-right sm:block">
        <div className="font-mono text-label uppercase text-ink-faint">
          Desire
        </div>
        <div className="font-mono text-sm font-medium tabular-nums text-ink">
          {item.desire}
        </div>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right">
        <div className="font-mono text-label uppercase text-ink-faint">Price</div>
        <div className="font-mono text-sm font-semibold tabular-nums text-ink sm:text-base">
          {formatPrice(item.price)}
        </div>
      </div>

      {/* Buy */}
      {isActive ? (
        <button
          type="button"
          aria-label="Decide to buy"
          title="Decide to buy"
          onClick={() => onBuy(item)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line-strong text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-white"
        >
          <ShoppingCartIcon className="h-[18px] w-[18px]" />
        </button>
      ) : null}
    </li>
  );
}
