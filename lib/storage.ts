// ---------------------------------------------------------------------------
// Persistence boundary.
//
// Everything that knows *where* data lives is isolated here. By default the
// app stores everything in localStorage (great for local dev — no backend
// needed). When NEXT_PUBLIC_STORAGE === "api", it talks to /api/state and
// /api/auth instead, so a deployed instance persists to a real database and
// front-end changes never touch the stored data. The React store and UI above
// this file stay identical either way.
// ---------------------------------------------------------------------------

import type { Category, PersistedState } from "./types";

const STORAGE_KEY = "considered.v1";
const CURRENT_VERSION = 1;

/** True when the app should persist through the hosted API instead of localStorage. */
export const API_MODE = process.env.NEXT_PUBLIC_STORAGE === "api";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat_tech", name: "Tech" },
  { id: "cat_exercise", name: "Exercise" },
  { id: "cat_fashion", name: "Fashion" },
  { id: "cat_health", name: "Health" },
  { id: "cat_home", name: "Home" },
];

export function emptyState(): PersistedState {
  return {
    version: CURRENT_VERSION,
    items: [],
    categories: DEFAULT_CATEGORIES,
  };
}

/** Coerce an unknown blob into a valid, fully-shaped PersistedState. */
export function normalize(parsed: unknown): PersistedState {
  if (!parsed || typeof parsed !== "object") return emptyState();
  const p = parsed as Partial<PersistedState>;
  return {
    version: p.version ?? CURRENT_VERSION,
    items: Array.isArray(p.items) ? p.items : [],
    categories:
      Array.isArray(p.categories) && p.categories.length > 0
        ? p.categories
        : DEFAULT_CATEGORIES,
  };
}

// --- localStorage backend --------------------------------------------------

function localLoad(): PersistedState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

function localSave(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or privacy-mode failures: fail quietly, the app stays usable.
  }
}

// --- API backend -----------------------------------------------------------

export type AuthInfo = { required: boolean; authed: boolean };

export async function apiAuthStatus(): Promise<AuthInfo> {
  const res = await fetch("/api/auth", { cache: "no-store" });
  if (!res.ok) return { required: true, authed: false };
  return (await res.json()) as AuthInfo;
}

/** Returns true on success. */
export async function apiLogin(passphrase: string): Promise<boolean> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  return res.ok;
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE" });
}

// --- Unified async interface ----------------------------------------------

/** Read persisted state. In API mode, assumes the caller has confirmed auth. */
export async function loadState(): Promise<PersistedState> {
  if (!API_MODE) return localLoad();
  const res = await fetch("/api/state", { cache: "no-store" });
  if (!res.ok) return emptyState();
  const body = (await res.json()) as { state: PersistedState | null };
  return body.state ? normalize(body.state) : emptyState();
}

/** Persist the whole state blob. */
export async function saveState(state: PersistedState): Promise<void> {
  if (!API_MODE) {
    localSave(state);
    return;
  }
  await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
}

export { STORAGE_KEY, CURRENT_VERSION };
