"use client";

import { useStore } from "@/lib/store";
import { PlusIcon } from "./icons";

// A quiet horizontal filter bar. "All" plus one chip per category.
// Reflection happens partly by browsing wants grouped this way.

export default function CategoryFilter({
  active,
  onChange,
  counts,
  onManage,
}: {
  active: string | null; // null = All
  onChange: (categoryId: string | null) => void;
  counts: { all: number; byCategory: Record<string, number> };
  onManage: () => void;
}) {
  const { categories } = useStore();

  const chip = (
    key: string,
    label: string,
    count: number,
    selected: boolean,
    on: () => void
  ) => (
    <button
      key={key}
      type="button"
      onClick={on}
      className={
        selected
          ? "shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-white"
          : "shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-line-strong"
      }
    >
      {label}
      <span
        className={
          "ml-1.5 font-mono tabular-nums " +
          (selected ? "text-white/60" : "text-ink-faint")
        }
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chip("__all", "All", counts.all, active === null, () => onChange(null))}
      {categories.map((cat) =>
        chip(
          cat.id,
          cat.name,
          counts.byCategory[cat.id] ?? 0,
          active === cat.id,
          () => onChange(cat.id)
        )
      )}
      {/* Add / review categories — kept right alongside the tags. */}
      <button
        type="button"
        onClick={onManage}
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        New
      </button>
    </div>
  );
}
