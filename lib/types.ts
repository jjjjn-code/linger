// Core domain types for the considered-purchase tool.

export type ItemStatus = "active" | "bought" | "archived";

export interface Item {
  id: string;
  url: string; // required — the link to the product
  name: string;
  brand: string;
  imageUrl: string;
  /** Price in major currency units (GBP). null = unknown / not yet entered. */
  price: number | null;
  /** Category ids. The first entry is treated as the primary category. */
  categoryIds: string[];
  /** Desire 1–10 */
  desire: number;
  /** Positive impact 1–10 */
  impact: number;
  /** Optional free-text reason for wanting it. */
  note: string;
  /** ISO date (YYYY-MM-DD) the item was logged. Editable. */
  loggedAt: string;
  status: ItemStatus;
  /** ISO date (YYYY-MM-DD) the item was marked bought. Set when status = bought. */
  boughtAt?: string;
  /** ISO date (YYYY-MM-DD) the item was let go. Set when status = archived. */
  archivedAt?: string;
  /** Why the user decided to buy — captured at the buy moment (required there). */
  purchaseReason?: string;
  /** Legacy single post-purchase reflection. Superseded by postPurchaseLog. */
  postPurchaseNote?: string;
  /** Timestamped post-purchase reflections — "how do I feel now?", logged over time. */
  postPurchaseLog?: { at: string; text: string }[];
  /** Why the user let it go — captured at the let-go moment. */
  letGoReasons?: string[];
  /** Optional time-sensitive flag note (e.g. a ticket date, a deadline). */
  flagNote?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Category {
  id: string;
  name: string;
}

/** Best-effort metadata returned by the server fetch route. All fields optional. */
export interface FetchedMetadata {
  name?: string;
  brand?: string;
  imageUrl?: string;
  price?: number | null;
  ok: boolean;
  /** Human-readable note about what happened (e.g. "blocked", "partial"). */
  message?: string;
}

/** The shape persisted locally. Versioned so future migrations are clean. */
export interface PersistedState {
  version: number;
  items: Item[];
  categories: Category[];
}
