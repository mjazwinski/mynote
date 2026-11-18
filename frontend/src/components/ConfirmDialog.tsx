import { useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  warning?: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/** Destructive-action confirmation (FR-015–FR-017). Cancel is focused by default. */
export function ConfirmDialog({ title, message, warning, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError("Deletion failed. Nothing was deleted — please try again.");
      setPending(false);
    }
  };

  return (
    <Modal
      title={title}
      role="alertdialog"
      onClose={() => !pending && onCancel()}
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? "Deleting…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-fg">{message}</p>
      {warning && (
        <div role="alert" className="rounded-lg border-2 border-danger bg-surface-raised p-3 font-medium text-danger">
          {warning}
        </div>
      )}
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </Modal>
  );
}
