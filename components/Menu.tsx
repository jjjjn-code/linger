"use client";

import { useEffect, useRef, useState } from "react";
import { MoreIcon } from "./icons";

export interface MenuAction {
  label: string;
  onSelect: () => void;
}

/**
 * A small "…" dropdown menu. Click-away and Escape close it. Used on cards and
 * rows for secondary actions (Edit, Let go, Move back) so the card body itself
 * stays free for the product link.
 */
export default function Menu({
  actions,
  label = "More actions",
  className = "",
}: {
  actions: MenuAction[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={"relative " + className}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <MoreIcon className="h-[18px] w-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-control border border-line bg-surface py-1 shadow-lift"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                action.onSelect();
              }}
              className="block w-full px-3.5 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
