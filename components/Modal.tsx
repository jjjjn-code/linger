"use client";

import { useEffect, useRef } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { CloseIcon } from "./icons";

// A calm, centered modal. Light scrim, soft lift, generous padding.
// On small screens it becomes a full-height sheet.

export default function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/20 p-0 backdrop-blur-[1px] sm:items-start sm:p-6 sm:pt-[6vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-full w-full flex-col bg-surface shadow-lift outline-none sm:max-h-[88vh] sm:w-full sm:max-w-lg sm:rounded-card"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-control p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-line px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
