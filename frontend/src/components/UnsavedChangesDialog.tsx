import { useRef } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface UnsavedChangesDialogProps {
  failedCount: number;
  pending: boolean;
  onRetry: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** Shown when unsaved changes could not be saved before switching category (FR-012). */
export function UnsavedChangesDialog({ failedCount, pending, onRetry, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const notes = failedCount === 1 ? "1 note" : `${failedCount} notes`;
  return (
    <Modal
      title="Unsaved changes"
      role="alertdialog"
      onClose={onCancel}
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onDiscard} disabled={pending}>
            Discard changes &amp; switch
          </Button>
          <Button variant="primary" onClick={onRetry} disabled={pending}>
            {pending ? "Saving…" : "Retry"}
          </Button>
        </>
      }
    >
      <p>
        Changes to {notes} could not be saved. Retry saving, discard the changes and switch, or
        cancel to stay on this category.
      </p>
    </Modal>
  );
}
