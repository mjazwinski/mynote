import { useCallback } from "react";
import { useStore } from "../state/notesStore";

/** Auto-save on blur (constitution Principle V, FR-009). */
export function useAutoSave(noteId: string) {
  const store = useStore();

  const onChange = useCallback(
    (content: string) => store.editNote(noteId, content),
    [store, noteId],
  );

  const onBlur = useCallback(() => {
    const saveState = store.getState().notes[noteId]?.saveState;
    if (saveState === "dirty" || saveState === "error") void store.saveNote(noteId);
  }, [store, noteId]);

  return { onChange, onBlur };
}
