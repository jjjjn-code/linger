"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { EditIcon, PlusIcon } from "./icons";

const inputCls =
  "w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";

export default function CategoryManager({ onClose }: { onClose: () => void }) {
  const { categories, items, addCategory, renameCategory, deleteCategory } =
    useStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirming, setConfirming] = useState<{ id: string; name: string } | null>(
    null
  );

  function countFor(id: string) {
    return items.filter((it) => it.categoryIds.includes(id)).length;
  }

  function commitRename() {
    if (editingId && editingName.trim()) {
      renameCategory(editingId, editingName);
    }
    setEditingId(null);
    setEditingName("");
  }

  const confirmCount = confirming ? countFor(confirming.id) : 0;

  return (
    <>
    <Modal title="Categories" onClose={onClose}>
      <div className="mb-5 flex gap-2">
        <input
          className={inputCls}
          placeholder="New category name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              addCategory(newName);
              setNewName("");
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (newName.trim()) {
              addCategory(newName);
              setNewName("");
            }
          }}
          className="flex shrink-0 items-center gap-1 rounded-control bg-ink px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-soft"
        >
          <PlusIcon className="h-4 w-4" />
          Add
        </button>
      </div>

      <ul className="divide-y divide-line">
        {categories.length === 0 ? (
          <li className="py-6 text-center text-sm text-ink-faint">
            No categories yet.
          </li>
        ) : null}
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center gap-3 py-3">
            {editingId === cat.id ? (
              <input
                autoFocus
                className={`${inputCls} flex-1`}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setEditingId(null);
                    setEditingName("");
                  }
                }}
              />
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-ink">
                  {cat.name}
                </span>
                <span className="text-meta text-ink-faint">
                  {countFor(cat.id)} item{countFor(cat.id) === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  aria-label={`Rename ${cat.name}`}
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditingName(cat.name);
                  }}
                  className="rounded p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming({ id: cat.id, name: cat.name })}
                  className="rounded px-2 py-1 text-meta text-danger transition-colors hover:text-danger-hover"
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Modal>
    {confirming ? (
      <ConfirmDialog
        title={`Delete "${confirming.name}"?`}
        message={
          confirmCount > 0
            ? `It will be removed from ${confirmCount} item${
                confirmCount === 1 ? "" : "s"
              } — the items themselves stay.`
            : "This category isn't used by any items."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteCategory(confirming.id);
          setConfirming(null);
        }}
        onCancel={() => setConfirming(null)}
      />
    ) : null}
    </>
  );
}
