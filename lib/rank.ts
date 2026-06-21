// ---------------------------------------------------------------------------
// Manual ranking helpers.
//
// In Rank mode the user drags items into their true order of wanting. That
// order is a sequence of item ids. These pure functions order items by that
// sequence, detect when the hand-order disagrees with the desire scores, and
// reconcile the scores with the *smallest* change that makes them consistent.
// ---------------------------------------------------------------------------

import type { Item } from "./types";

/**
 * Order items by a saved id sequence. Items missing from the sequence are
 * appended (most-wanted first, as a sensible starting point); ids in the
 * sequence that no longer exist are skipped.
 */
export function orderByRank(items: Item[], order: string[]): Item[] {
  const byId = new Map(items.map((it) => [it.id, it]));
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const id of order) {
    const it = byId.get(id);
    if (it) {
      out.push(it);
      seen.add(id);
    }
  }
  const leftovers = items
    .filter((it) => !seen.has(it.id))
    .sort((a, b) => b.desire - a.desire);
  return [...out, ...leftovers];
}

/**
 * True when desire scores are non-increasing down the list — i.e. nothing
 * lower in the order is wanted *more* (by score) than something above it.
 */
export function isConsistentWithDesire(orderedItems: Item[]): boolean {
  for (let i = 1; i < orderedItems.length; i++) {
    if (orderedItems[i].desire > orderedItems[i - 1].desire) return false;
  }
  return true;
}

export interface DesireChange {
  id: string;
  name: string;
  from: number;
  to: number;
}

/**
 * Smallest change that makes desire non-increasing down the order: keep each
 * score unless it exceeds the one above it, in which case lower it to match.
 * The top item is always kept. Returns only the items that actually change.
 */
export function reconcileDesire(orderedItems: Item[]): DesireChange[] {
  const changes: DesireChange[] = [];
  let ceiling = 10; // top item can keep any value 1..10
  for (const item of orderedItems) {
    const to = Math.min(item.desire, ceiling);
    if (to !== item.desire) {
      changes.push({ id: item.id, name: item.name, from: item.desire, to });
    }
    ceiling = to;
  }
  return changes;
}
