// Sorting for the item list. Pure functions — no scoring, just ordering.

import type { Item } from "./types";

export type SortKey = "date" | "price" | "desire";
export type SortDir = "asc" | "desc";

export const SORT_LABELS: Record<SortKey, string> = {
  date: "Date logged",
  price: "Price",
  desire: "Desire",
};

export const SORT_ORDER: SortKey[] = ["date", "price", "desire"];

/** Sensible default direction for each sort (what people usually want first). */
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  date: "desc", // newest first
  price: "asc", // cheapest first
  desire: "desc", // most wanted first
};

export function sortItems(
  items: Item[],
  sort: SortKey,
  dir: SortDir
): Item[] {
  const sign = dir === "asc" ? 1 : -1;
  const out = [...items];
  out.sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "date":
        cmp = a.loggedAt.localeCompare(b.loggedAt);
        break;
      case "price": {
        // Unknown prices always sort to the end, regardless of direction.
        const ap = a.price ?? null;
        const bp = b.price ?? null;
        if (ap === null && bp === null) cmp = 0;
        else if (ap === null) return 1;
        else if (bp === null) return -1;
        else cmp = ap - bp;
        break;
      }
      case "desire":
        cmp = a.desire - b.desire;
        break;
    }
    // Stable tiebreak: most recently logged, then name.
    if (cmp === 0) cmp = a.loggedAt.localeCompare(b.loggedAt);
    if (cmp === 0) return a.name.localeCompare(b.name);
    return cmp * sign;
  });
  return out;
}
