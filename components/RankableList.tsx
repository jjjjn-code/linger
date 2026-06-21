"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  isConsistentWithDesire,
  reconcileDesire,
  type DesireChange,
} from "@/lib/rank";
import ItemListRow from "./ItemListRow";

interface RowActions {
  onView: (item: Item) => void;
  onBuy: (item: Item) => void;
}

function SortableRow({ item, actions }: { item: Item; actions: RowActions }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <ItemListRow
      item={item}
      {...actions}
      rank={{
        setNodeRef,
        setActivatorNodeRef,
        attributes,
        listeners,
        isDragging,
        style: {
          transform: CSS.Transform.toString(transform),
          transition,
        },
      }}
    />
  );
}

export default function RankableList({
  items,
  onReorder,
  actions,
}: {
  items: Item[]; // already in current rank order
  onReorder: (orderedIds: string[]) => void;
  actions: RowActions;
}) {
  const { updateItem } = useStore();
  const [pending, setPending] = useState<DesireChange[] | null>(null);

  const sensors = useSensors(
    // A small drag threshold so a plain click on the handle still works.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((it) => it.id));

    // If the new hand-order disagrees with the desire scores, surface it.
    if (!isConsistentWithDesire(reordered)) {
      setPending(reconcileDesire(reordered));
    } else {
      setPending(null);
    }
  }

  function applyChanges() {
    if (pending) {
      for (const change of pending) updateItem(change.id, { desire: change.to });
    }
    setPending(null);
  }

  return (
    <div>
      {pending && pending.length > 0 ? (
        <ReconcileCallout
          changes={pending}
          onUpdate={applyChanges}
          onKeep={() => setPending(null)}
        />
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((it) => it.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-2.5">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} actions={actions} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function ReconcileCallout({
  changes,
  onUpdate,
  onKeep,
}: {
  changes: DesireChange[];
  onUpdate: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="mb-4 rounded-card border border-line-strong bg-surface p-4 shadow-soft sm:p-5">
      <p className="text-sm font-semibold text-ink">
        Your order doesn&rsquo;t quite match your desire scores
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        You&rsquo;ve placed some items above others you&rsquo;d rated lower. Want
        to keep just this order, or update the desire scores to fit it? I&rsquo;ll
        change as little as possible:
      </p>
      <ul className="mt-3 space-y-1">
        {changes.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-2 text-meta text-ink-soft"
          >
            <span className="truncate font-medium text-ink">
              {c.name || "Untitled item"}
            </span>
            <span className="tabular-nums text-ink-muted">
              desire {c.from} → {c.to}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onUpdate}
          className="rounded-control bg-ink px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
        >
          Update desire scores
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="rounded-control px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
        >
          Keep order only
        </button>
      </div>
    </div>
  );
}
