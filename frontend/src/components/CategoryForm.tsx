import { useId, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { CATEGORY_NAME_MAX, type Category } from "../api/types";
import { useStore } from "../state/notesStore";
import { Button } from "./Button";
import { Modal } from "./Modal";

export function validateCategoryName(raw: string): string | null {
  const name = raw.trim();
  if (name.length === 0) return "Please enter a category name.";
  if (name.length > CATEGORY_NAME_MAX) return `Use at most ${CATEGORY_NAME_MAX} characters.`;
  return null;
}

export function serverMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) return "A category with this name already exists.";
  if (err instanceof ApiError && err.status === 422) return err.detail;
  return "Could not create the category. Please try again.";
}

export interface CategoryFormProps {
  onCreated: (category: Category) => void;
  onCancel: () => void;
}

export function CategoryForm({ onCreated, onCancel }: CategoryFormProps) {
  const store = useStore();
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validateCategoryName(name);
    setError(problem);
    if (problem) return;
    setPending(true);
    try {
      onCreated(await store.addCategory(name.trim()));
    } catch (err) {
      setError(serverMessage(err));
      setPending(false);
    }
  };

  return (
    <Modal title="New category" onClose={onCancel} initialFocusRef={inputRef}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor={inputId} className="block text-sm font-medium">
            Category name
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className="min-h-11 w-full rounded-lg border border-border bg-surface-raised px-3 text-base text-fg"
            autoComplete="off"
          />
          {error && (
            <p id={errorId} role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            Create category
          </Button>
        </div>
      </form>
    </Modal>
  );
}
