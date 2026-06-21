"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

const REASONS = [
  "I don't want it anymore",
  "I found something better",
  "Too expensive to justify right now",
  "It was just a passing want",
];

// Letting go is a reflective moment — we capture *why* (optional), so the
// "changed my mind" list teaches you about your own passing wants over time.
export default function LetGoDialog({
  itemName,
  onConfirm,
  onCancel,
}: {
  itemName: string;
  onConfirm: (reasons: string[]) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [otherOn, setOtherOn] = useState(false);
  const [other, setOther] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function toggle(reason: string) {
    setChecked((c) => ({ ...c, [reason]: !c[reason] }));
  }

  function confirm() {
    const reasons = REASONS.filter((r) => checked[r]);
    if (otherOn && other.trim()) reasons.push(other.trim());
    onConfirm(reasons);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/20 p-5 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label="Let this go?"
        tabIndex={-1}
        className="w-full max-w-md rounded-card bg-surface p-6 shadow-lift outline-none"
      >
        <h2 className="text-base font-semibold text-ink">Let this go?</h2>
        <p className="mt-1 text-sm text-ink-muted">
          &ldquo;{itemName || "This item"}&rdquo; moves to your Let go list — you
          can bring it back any time. What changed?{" "}
          <span className="text-ink-faint">(optional)</span>
        </p>

        <div className="mt-4 space-y-2.5">
          {REASONS.map((reason) => (
            <label
              key={reason}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft"
            >
              <input
                type="checkbox"
                checked={!!checked[reason]}
                onChange={() => toggle(reason)}
                className="h-4 w-4 shrink-0 accent-ink"
              />
              {reason}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={otherOn}
              onChange={() => setOtherOn((v) => !v)}
              className="h-4 w-4 shrink-0 accent-ink"
            />
            Something else
          </label>
          {otherOn ? (
            <input
              autoFocus
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="What made you change your mind?"
              className="ml-6 w-[calc(100%-1.5rem)] rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-control px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-control bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger-hover"
          >
            Let go
          </button>
        </div>
      </div>
    </div>
  );
}
