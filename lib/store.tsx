"use client";

// ---------------------------------------------------------------------------
// React store. Holds items + categories in memory, exposes CRUD, and mirrors
// every change to the persistence boundary (lib/storage). UI talks only to
// this hook, never to localStorage directly.
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Category, Item, PersistedState } from "./types";
import {
  API_MODE,
  CURRENT_VERSION,
  apiAuthStatus,
  apiLogin,
  apiLogout,
  emptyState,
  loadState,
  normalize,
  saveState,
} from "./storage";
import { todayISODate } from "./format";

/** Auth gate state. In localStorage mode this is always "ready". */
export type AuthStatus = "loading" | "needs-auth" | "ready";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** Fields a caller supplies when creating an item. Sensible defaults fill the rest. */
export interface NewItemInput {
  url: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  price?: number | null;
  categoryIds?: string[];
  desire?: number;
  impact?: number;
  note?: string;
  flagNote?: string;
  loggedAt?: string;
}

interface StoreValue {
  ready: boolean;
  authStatus: AuthStatus;
  items: Item[];
  categories: Category[];

  /** True when persisting through the hosted API rather than localStorage. */
  apiMode: boolean;
  /** Attempt passphrase login (API mode). Resolves true on success. */
  login: (passphrase: string) => Promise<boolean>;
  /** Clear the session and return to the login gate (API mode). */
  signOut: () => Promise<void>;
  /** Replace the entire dataset — used by Import. */
  replaceAll: (next: PersistedState) => void;
  /** The full persisted blob — used by Export. */
  snapshot: () => PersistedState;

  addItem: (input: NewItemInput) => Item;
  updateItem: (id: string, patch: Partial<Item>) => void;
  deleteItem: (id: string) => void;

  markBought: (id: string, reason?: string) => void;
  letGo: (id: string, reasons?: string[]) => void;
  restore: (id: string) => void;

  addCategory: (name: string) => Category;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  categoryName: (id: string) => string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>({
    version: CURRENT_VERSION,
    items: [],
    categories: [],
  });
  const [ready, setReady] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  // Skips the save that would otherwise fire right after we hydrate, so we
  // never echo freshly-loaded data straight back to the store.
  const skipNextSave = useRef(false);

  // Hydrate on mount (client only). In API mode, check auth first and hold at
  // the login gate until the passphrase is accepted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (API_MODE) {
        const info = await apiAuthStatus();
        if (cancelled) return;
        if (info.required && !info.authed) {
          setAuthStatus("needs-auth");
          return;
        }
      }
      const loaded = await loadState();
      if (cancelled) return;
      skipNextSave.current = true;
      setState(loaded);
      setAuthStatus("ready");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist whenever state changes, but not before hydration completes
  // (otherwise we'd overwrite stored data with the empty initial state).
  // API writes are debounced so rapid edits collapse into one request.
  useEffect(() => {
    if (!ready) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!API_MODE) {
      saveState(state);
      return;
    }
    const t = setTimeout(() => {
      void saveState(state);
    }, 600);
    return () => clearTimeout(t);
  }, [state, ready]);

  const login = useCallback(async (passphrase: string): Promise<boolean> => {
    const ok = await apiLogin(passphrase);
    if (!ok) return false;
    const loaded = await loadState();
    skipNextSave.current = true;
    setState(loaded);
    setAuthStatus("ready");
    setReady(true);
    return true;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await apiLogout();
    setReady(false);
    setState(emptyState());
    setAuthStatus("needs-auth");
  }, []);

  const replaceAll = useCallback((next: PersistedState) => {
    setState(normalize(next));
  }, []);

  const addItem = useCallback((input: NewItemInput): Item => {
    const now = new Date().toISOString();
    const item: Item = {
      id: uid("item"),
      url: input.url.trim(),
      name: input.name?.trim() ?? "",
      brand: input.brand?.trim() ?? "",
      imageUrl: input.imageUrl?.trim() ?? "",
      price: input.price ?? null,
      categoryIds: input.categoryIds ?? [],
      desire: input.desire ?? 5,
      impact: input.impact ?? 5,
      note: input.note?.trim() ?? "",
      flagNote: input.flagNote?.trim() || undefined,
      loggedAt: input.loggedAt ?? todayISODate(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    setState((s) => ({ ...s, items: [item, ...s.items] }));
    return item;
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<Item>) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it) =>
        it.id === id
          ? { ...it, ...patch, updatedAt: new Date().toISOString() }
          : it
      ),
    }));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));
  }, []);

  // Lifecycle transitions. Each stamps the relevant date and clears fields that
  // only make sense in another state.
  const setStatus = useCallback(
    (
      id: string,
      status: Item["status"],
      opts: { reason?: string; letGoReasons?: string[] } = {}
    ) => {
      const today = todayISODate();
      const now = new Date().toISOString();
      setState((s) => ({
        ...s,
        items: s.items.map((it) => {
          if (it.id !== id) return it;
          const bought = status === "bought";
          const archived = status === "archived";
          return {
            ...it,
            status,
            boughtAt: bought ? it.boughtAt ?? today : undefined,
            archivedAt: archived ? it.archivedAt ?? today : undefined,
            // Purchase fields only live on bought items.
            purchaseReason: bought ? opts.reason ?? it.purchaseReason : undefined,
            postPurchaseNote: bought ? it.postPurchaseNote : undefined,
            postPurchaseLog: bought ? it.postPurchaseLog : undefined,
            // Let-go reasons only live on archived items.
            letGoReasons: archived
              ? opts.letGoReasons ?? it.letGoReasons
              : undefined,
            updatedAt: now,
          };
        }),
      }));
    },
    []
  );

  const markBought = useCallback(
    (id: string, reason?: string) => setStatus(id, "bought", { reason }),
    [setStatus]
  );
  const letGo = useCallback(
    (id: string, reasons?: string[]) =>
      setStatus(id, "archived", { letGoReasons: reasons }),
    [setStatus]
  );
  const restore = useCallback(
    (id: string) => setStatus(id, "active"),
    [setStatus]
  );

  const addCategory = useCallback((name: string): Category => {
    const cat: Category = { id: uid("cat"), name: name.trim() };
    setState((s) => ({ ...s, categories: [...s.categories, cat] }));
    return cat;
  }, []);

  const renameCategory = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, name: name.trim() } : c
      ),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      // Remove the category from any items that referenced it.
      items: s.items.map((it) =>
        it.categoryIds.includes(id)
          ? { ...it, categoryIds: it.categoryIds.filter((c) => c !== id) }
          : it
      ),
    }));
  }, []);

  const value = useMemo<StoreValue>(() => {
    const nameById = new Map(state.categories.map((c) => [c.id, c.name]));
    return {
      ready,
      authStatus,
      items: state.items,
      categories: state.categories,
      apiMode: API_MODE,
      login,
      signOut,
      replaceAll,
      snapshot: () => state,
      addItem,
      updateItem,
      deleteItem,
      markBought,
      letGo,
      restore,
      addCategory,
      renameCategory,
      deleteCategory,
      categoryName: (id: string) => nameById.get(id) ?? "Unknown",
    };
  }, [
    ready,
    authStatus,
    state,
    login,
    signOut,
    replaceAll,
    addItem,
    updateItem,
    deleteItem,
    markBought,
    letGo,
    restore,
    addCategory,
    renameCategory,
    deleteCategory,
  ]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
