import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NOTE_CONTENT_MAX } from "../api/types";
import { useAutoSave } from "../hooks/useAutoSave";
import { useNotesState, useStore } from "../state/notesStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { ArrowDownIcon, ArrowUpIcon, GripIcon, TrashIcon } from "./Icons";
import { SaveIndicator } from "./SaveIndicator";

const iconButton =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-raised hover:text-fg disabled:cursor-not-allowed disabled:opacity-40";

export interface NoteCardProps {
  noteId: string;
  index: number;
  total: number;
}

export function NoteCard({ noteId, index, total }: NoteCardProps) {
  const store = useStore();
  const noteState = useNotesState((s) => s.notes[noteId]);
  const shouldFocus = useNotesState((s) => s.focusNoteId === noteId);
  const { onChange, onBlur } = useAutoSave(noteId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: noteId });

  // Grow the textarea with its content.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [noteState?.content]);

  useEffect(() => {
    if (shouldFocus) {
      textareaRef.current?.focus();
      store.focusHandled();
    }
  }, [shouldFocus, store]);

  if (!noteState) return null;
  const position = index + 1;

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`Note ${position} of ${total}`}
      data-testid="note-card"
      data-note-id={noteId}
      className={`flex flex-col rounded-xl border bg-surface shadow-sm ${
        noteState.saveState === "error" ? "border-danger" : "border-border"
      } ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-1 border-b border-border px-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Reorder note"
          className={`${iconButton} cursor-grab touch-none active:cursor-grabbing`}
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
        <button
          type="button"
          aria-label="Move up"
          className={iconButton}
          disabled={index === 0}
          onClick={() => void store.reorder(index, index - 1)}
        >
          <ArrowUpIcon />
        </button>
        <button
          type="button"
          aria-label="Move down"
          className={iconButton}
          disabled={index >= total - 1}
          onClick={() => void store.reorder(index, index + 1)}
        >
          <ArrowDownIcon />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <SaveIndicator state={noteState.saveState} onRetry={() => void store.saveNote(noteId)} />
          <button
            type="button"
            aria-label="Delete note"
            className={`${iconButton} hover:text-danger`}
            onClick={() => setConfirmingDelete(true)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        aria-label={`Note ${position} content`}
        value={noteState.content}
        maxLength={NOTE_CONTENT_MAX}
        rows={4}
        placeholder="Write something…"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="min-h-28 w-full resize-none overflow-hidden rounded-b-xl bg-transparent p-3 text-base leading-relaxed text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:-outline-offset-2"
      />
      {noteState.saveState === "error" && (
        <p className="px-3 pb-3 text-sm text-danger">
          Your changes are kept on this device. Retry when the connection is back.
        </p>
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this note?"
          message="The note will be permanently deleted."
          confirmLabel="Delete note"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => store.deleteNote(noteId)}
        />
      )}
    </article>
  );
}
