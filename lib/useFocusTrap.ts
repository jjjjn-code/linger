"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog focus management:
 * - moves focus into the dialog container on open,
 * - keeps Tab / Shift+Tab cycling within it (focus trap),
 * - returns focus to the previously focused element on close.
 *
 * The container element must accept focus (give it tabIndex={-1}).
 */
export function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Defer initial focus so children that set their own focus (e.g. an
    // autofocused field) win — child effects run before this parent effect,
    // but a rAF keeps us safe regardless of nesting.
    const raf = requestAnimationFrame(() => {
      if (!node.contains(document.activeElement)) node.focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusables = Array.from(
        node!.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.getClientRects().length > 0);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey) {
        if (active === first || !node!.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !node!.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    node.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [ref]);
}
