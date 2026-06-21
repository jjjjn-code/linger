// Small, dependency-free formatting + date helpers.

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

export function formatPrice(price: number | null): string {
  if (price === null || Number.isNaN(price)) return "—";
  // Drop the .00 on whole amounts for a cleaner read.
  if (Number.isInteger(price)) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(price);
  }
  return gbp.format(price);
}

/** Today's date as an ISO date string (YYYY-MM-DD) in local time. */
export function todayISODate(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** Whole days between a logged date (YYYY-MM-DD) and today. Never negative. */
export function daysOnList(loggedAtISODate: string): number {
  const logged = new Date(loggedAtISODate + "T00:00:00");
  const now = new Date(todayISODate() + "T00:00:00");
  const ms = now.getTime() - logged.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function daysOnListLabel(loggedAtISODate: string): string {
  const d = daysOnList(loggedAtISODate);
  if (d === 0) return "Today";
  if (d === 1) return "1 day";
  return `${d} days`;
}

/** Friendly long-form date, e.g. "13 Jun 2026". */
export function formatLoggedDate(loggedAtISODate: string): string {
  const d = new Date(loggedAtISODate + "T00:00:00");
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Whole days between two ISO dates (YYYY-MM-DD). Never negative. */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
