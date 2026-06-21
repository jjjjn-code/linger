"use client";

import { useEffect, useState } from "react";

// A tiny localStorage-backed state hook for lightweight UI preferences
// (priority weights, chosen sort) that live outside the main item store.
// SSR-safe: starts from `initial`, hydrates on mount, then persists changes.

export function usePersistentState<T>(
  key: string,
  initial: T
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value, ready]);

  return [value, setValue];
}
