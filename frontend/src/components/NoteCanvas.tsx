import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { useNotesState, useStore } from "../state/notesStore";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { PlusIcon, TrashIcon } from "./Icons";
import { NoteCard } from "./NoteCard";

/** Index change for a drop; null when the drop is outside the canvas or a no-op. */
export function dropMove(order: string[], activeId: string, overId: string | null) {
  if (!overId || activeId === overId) return null;
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  return from < 0 || to < 0 ? null : { from, to };
}

export function NoteCanvas() {
  const store = useStore();
  const category = useNotesState((s) => s.categories.find((c) => c.id === s.activeCategoryId));
  const order = useNotesState((s) => s.order);
  const loading = useNotesState((s) => s.notesLoading);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!category) return null;

  // Only notes of this canvas are sortable targets, so dropping on a category tab is a no-op.
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const move = dropMove(order, String(active.id), over ? String(over.id) : null);
    if (move) void store.reorder(move.from, move.to);
  };

  const noteCount = order.length;

  return (
    <section aria-labelledby="canvas-title" className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur sm:px-6">
        <h1 id="canvas-title" className="min-w-0 flex-1 truncate text-xl font-semibold" title={category.name}>
          {category.name}
        </h1>
        <Button variant="primary" onClick={() => void store.addNote()}>
          <PlusIcon />
          Add note
        </Button>
        <Button variant="ghost" className="text-danger" onClick={() => setConfirmingRemove(true)}>
          <TrashIcon />
          Remove category
        </Button>
      </header>

      <div className="flex-1 p-4 sm:p-6">
        {loading && <p className="text-fg-muted">Loading notes…</p>}
        {!loading && noteCount === 0 && (
          <p className="text-fg-muted">No notes yet. Use “Add note” to write the first one.</p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[2200px]:grid-cols-5 min-[3000px]:grid-cols-6">
              {order.map((id, index) => (
                <NoteCard key={id} noteId={id} index={index} total={noteCount} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {confirmingRemove && (
        <ConfirmDialog
          title={`Remove category “${category.name}”?`}
          message="The category and its canvas will be permanently removed."
          warning={
            noteCount > 0
              ? `This category contains ${noteCount} ${noteCount === 1 ? "note" : "notes"}. They will be permanently deleted.`
              : undefined
          }
          confirmLabel="Remove category"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={async () => {
            await store.deleteCategory(category.id);
          }}
        />
      )}
    </section>
  );
}
