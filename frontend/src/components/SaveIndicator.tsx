import type { SaveState } from "../state/notesStore";

const LABELS: Record<Exclude<SaveState, "error">, string> = {
  saved: "Saved",
  dirty: "Unsaved",
  saving: "Saving…",
};

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1 text-sm">
        <span className="font-medium text-danger">Save failed</span>
        <span aria-hidden="true">–</span>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 font-medium text-accent underline"
        >
          Retry
        </button>
      </span>
    );
  }
  return (
    <span
      role="status"
      aria-live="polite"
      data-state={state}
      className={`text-sm ${state === "saved" ? "text-fg-muted" : "font-medium text-fg"}`}
    >
      {LABELS[state]}
    </span>
  );
}
