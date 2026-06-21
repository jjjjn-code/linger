// ---------------------------------------------------------------------------
// Reflection logic. Pure functions that turn the dated history of items into
// gentle signals and a few honest stats about whether waiting is working.
// ---------------------------------------------------------------------------

import type { Item } from "./types";
import { daysBetween, daysOnList } from "./format";

// "Still rate it highly" vs "not rated highly" thresholds for the signals.
export const HIGH_DESIRE = 7;
export const LOW_DESIRE = 4;

export const DEFAULT_THRESHOLD_DAYS = 30;

/**
 * Wants held past the threshold that you STILL rate highly — a quiet signal
 * the desire has lasted and might be worth acting on. Most-wanted first.
 */
export function worthRevisiting(active: Item[], thresholdDays: number): Item[] {
  return active
    .filter(
      (it) =>
        daysOnList(it.loggedAt) >= thresholdDays && it.desire >= HIGH_DESIRE
    )
    .sort(
      (a, b) =>
        b.desire - a.desire || daysOnList(b.loggedAt) - daysOnList(a.loggedAt)
    );
}

/**
 * Wants logged a while ago that you've never rated highly — candidates to let
 * go. Oldest first.
 */
export function archiveCandidates(
  active: Item[],
  thresholdDays: number
): Item[] {
  return active
    .filter(
      (it) =>
        daysOnList(it.loggedAt) >= thresholdDays && it.desire <= LOW_DESIRE
    )
    .sort((a, b) => daysOnList(b.loggedAt) - daysOnList(a.loggedAt));
}

export interface MonthBucket {
  key: string; // YYYY-MM
  label: string; // e.g. "Jun" (with year suffix when the range crosses years)
  count: number;
}

/**
 * Items added (by logged date) per calendar month, as a contiguous run from the
 * earliest logged month to this month, capped to the most recent `maxMonths`.
 * Lets the dashboard show when wanting spiked.
 */
export function itemsAddedByMonth(
  items: Item[],
  maxMonths = 12
): MonthBucket[] {
  if (items.length === 0) return [];
  const counts = new Map<string, number>();
  for (const it of items) {
    const key = it.loggedAt.slice(0, 7); // YYYY-MM
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const keys = [...counts.keys()].sort();
  const [startY, startM] = keys[0].split("-").map(Number);
  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  const buckets: MonthBucket[] = [];
  let y = startY;
  let m = startM;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const multiYear = startY !== endY;
  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    buckets.push({
      key,
      label: multiYear ? `${months[m - 1]} '${String(y).slice(2)}` : months[m - 1],
      count: counts.get(key) ?? 0,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return buckets.slice(-maxMonths);
}

export interface MonthFlow {
  key: string; // YYYY-MM
  label: string; // short month, e.g. "Jun"
  year: string; // 2-digit year, e.g. "25"
  considered: number; // items logged that month
  bought: number; // items bought that month
  letGo: number; // items let go that month
  valueLetGo: number; // £ value of items let go that month (known prices)
}

/**
 * Per-month flow: how many items were considered (logged), bought, and let go in
 * each calendar month — by loggedAt / boughtAt / archivedAt respectively. Powers
 * the dashboard's grouped bar chart.
 */
export function itemFlowByMonth(items: Item[], maxMonths = 12): MonthFlow[] {
  if (items.length === 0) return [];
  const considered = new Map<string, number>();
  const bought = new Map<string, number>();
  const letGo = new Map<string, number>();
  const letGoValue = new Map<string, number>();
  const bump = (m: Map<string, number>, iso?: string, by = 1) => {
    if (!iso) return;
    const k = iso.slice(0, 7);
    m.set(k, (m.get(k) ?? 0) + by);
  };
  for (const it of items) {
    bump(considered, it.loggedAt);
    if (it.status === "bought") bump(bought, it.boughtAt);
    if (it.status === "archived") {
      bump(letGo, it.archivedAt);
      if (it.price != null && Number.isFinite(it.price)) {
        bump(letGoValue, it.archivedAt, it.price);
      }
    }
  }

  const allKeys = [
    ...considered.keys(),
    ...bought.keys(),
    ...letGo.keys(),
  ].sort();
  const [startY, startM] = allKeys[0].split("-").map(Number);
  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const out: MonthFlow[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push({
      key,
      label: months[m - 1],
      year: String(y).slice(2),
      considered: considered.get(key) ?? 0,
      bought: bought.get(key) ?? 0,
      letGo: letGo.get(key) ?? 0,
      valueLetGo: letGoValue.get(key) ?? 0,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out.slice(-maxMonths);
}

export interface ReflectionStats {
  considering: number;
  bought: number;
  letGo: number;
  resolved: number; // bought + letGo
  /** Fraction of resolved wants you let go rather than bought (0–1). */
  letGoShare: number;
  /** Sum of prices of let-go items where price is known. */
  valueLetGo: number;
  /** Whether any let-go item had a known price (so valueLetGo is meaningful). */
  hasValueLetGo: boolean;
  avgDaysBeforeLetGo: number | null;
  avgDaysBeforeBought: number | null;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function computeStats(items: Item[]): ReflectionStats {
  const active = items.filter((it) => it.status === "active");
  const bought = items.filter((it) => it.status === "bought");
  const archived = items.filter((it) => it.status === "archived");

  const resolved = bought.length + archived.length;

  const pricedLetGo = archived.filter(
    (it) => it.price != null && Number.isFinite(it.price)
  );
  const valueLetGo = pricedLetGo.reduce((sum, it) => sum + (it.price ?? 0), 0);

  const letGoWaits = archived
    .filter((it) => it.archivedAt)
    .map((it) => daysBetween(it.loggedAt, it.archivedAt as string));
  const boughtWaits = bought
    .filter((it) => it.boughtAt)
    .map((it) => daysBetween(it.loggedAt, it.boughtAt as string));

  return {
    considering: active.length,
    bought: bought.length,
    letGo: archived.length,
    resolved,
    letGoShare: resolved > 0 ? archived.length / resolved : 0,
    valueLetGo,
    hasValueLetGo: pricedLetGo.length > 0,
    avgDaysBeforeLetGo: average(letGoWaits),
    avgDaysBeforeBought: average(boughtWaits),
  };
}
