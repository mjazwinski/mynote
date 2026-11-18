import { Button } from "./Button";
import { PlusIcon } from "./Icons";

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Welcome to MyNote</h1>
        <p className="mb-6 text-fg-muted">
          Notes live in categories. Create a category first — it gets its own tab and canvas.
        </p>
        <Button variant="primary" onClick={onCreate}>
          <PlusIcon />
          Create your first category
        </Button>
      </div>
    </div>
  );
}
