"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  daysOnList,
  daysOnListLabel,
  formatLoggedDate,
  formatPrice,
} from "@/lib/format";
import Modal from "./Modal";
import { ExternalLinkIcon, FlagIcon, ImageIcon } from "./icons";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-label uppercase text-ink-faint">{label}</div>
      <div className="mt-0.5 text-sm text-ink-soft">{children}</div>
    </div>
  );
}

// Read-only detail view. Editing is a deliberate separate action; buying is
// captured here (with a required reason) so the decision lives with the item.
export default function DetailModal({
  item,
  focusPurchase = false,
  onEdit,
  onLetGo,
  onRestore,
  onClose,
}: {
  item: Item;
  focusPurchase?: boolean;
  onEdit: (item: Item) => void;
  onLetGo: (item: Item) => void;
  onRestore: (item: Item) => void;
  onClose: () => void;
}) {
  const { categoryName, markBought } = useStore();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const isActive = item.status === "active";
  const ready = reason.trim().length > 0;

  useEffect(() => {
    if (focusPurchase && reasonRef.current) {
      reasonRef.current.scrollIntoView({ block: "center" });
      reasonRef.current.focus();
    }
  }, [focusPurchase]);

  function confirmPurchase() {
    if (!ready) {
      setTouched(true);
      reasonRef.current?.focus();
      return;
    }
    markBought(item.id, reason.trim());
    onClose();
  }

  return (
    <Modal
      title="Details"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          {isActive ? (
            <button
              type="button"
              onClick={() => onLetGo(item)}
              className="rounded-control border border-danger/30 px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-white"
            >
              Let go
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRestore(item)}
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Move back to considering
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-control px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-control border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-sunken"
            >
              Edit
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Image */}
        <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-control bg-surface-sunken">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <ImageIcon className="h-7 w-7 text-ink-faint" />
          )}
        </div>

        {/* Headline */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold leading-tight text-ink">
              {item.name || "Untitled item"}
            </h3>
            <span className="shrink-0 font-mono text-base font-medium tabular-nums text-ink">
              {formatPrice(item.price)}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {item.brand || "No brand"}
          </p>
        </div>

        {/* Flag — time-sensitive note. */}
        {item.flagNote ? (
          <div className="flex items-start gap-2 rounded-control bg-flag-soft px-3 py-2">
            <FlagIcon className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
            <span className="text-sm text-flag">{item.flagNote}</span>
          </div>
        ) : null}

        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
          <Field label="Desire">{item.desire}/10</Field>
          <Field label="On list">{daysOnListLabel(item.loggedAt)}</Field>
          <Field label="Logged">{formatLoggedDate(item.loggedAt)}</Field>
          <Field label="Categories">
            {item.categoryIds.length > 0
              ? item.categoryIds.map(categoryName).join(", ")
              : "Uncategorised"}
          </Field>
          {item.note ? (
            <div className="col-span-2">
              <Field label="Why you want it">
                <span className="text-ink-muted">{item.note}</span>
              </Field>
            </div>
          ) : null}
          {item.status === "archived" && item.letGoReasons?.length ? (
            <div className="col-span-2">
              <Field label="Why you let it go">
                <span className="text-ink-muted">
                  {item.letGoReasons.join(" · ")}
                </span>
              </Field>
            </div>
          ) : null}
        </div>

        {/* Product link — only when one exists. */}
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            View product page
          </a>
        ) : null}

        {/* Confirm purchase — only for items still under consideration */}
        {isActive ? (
          <div className="rounded-control border border-line bg-surface-page p-4">
            <p className="text-sm font-semibold text-ink">
              Decided to buy it?
            </p>
            <p className="mt-1 text-meta text-ink-faint">
              You&rsquo;ve considered this for {daysOnList(item.loggedAt)} day
              {daysOnList(item.loggedAt) === 1 ? "" : "s"}. Note why — you&rsquo;ll
              see it whenever you look back.
            </p>
            <textarea
              ref={reasonRef}
              className={
                "mt-3 min-h-[72px] w-full resize-y rounded-control border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none " +
                (touched && !ready
                  ? "border-ink focus:border-ink"
                  : "border-line-strong focus:border-ink")
              }
              placeholder="e.g. wanted it for weeks, it'll get daily use, and the price held."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {touched && !ready ? (
              <p className="mt-1.5 text-meta font-medium text-ink">
                Add a short reason to confirm — it&rsquo;s the point of buying
                deliberately.
              </p>
            ) : null}
            <button
              type="button"
              onClick={confirmPurchase}
              className="mt-3 rounded-control bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
            >
              Confirm purchase
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
