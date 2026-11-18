import { useUnsavedGuard } from "../hooks/useUnsavedGuard";
import { useNotesState } from "../state/notesStore";
import { useAppShell } from "./AppShell";
import { Button } from "./Button";
import { PlusIcon } from "./Icons";

/** Vertical category tabs on the left, in creation order (FR-002, FR-003). */
export function CategoryTabs({ onAddCategory }: { onAddCategory: () => void }) {
  const categories = useNotesState((s) => s.categories);
  const activeId = useNotesState((s) => s.activeCategoryId);
  const { requestSwitch, dialog } = useUnsavedGuard();
  const { closeDrawer } = useAppShell();

  const select = async (id: string) => {
    if (await requestSwitch(id)) closeDrawer();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">Categories</h2>
      </div>
      <nav aria-label="Category tabs" className="min-h-0 flex-1 overflow-y-auto px-2">
        <ul className="space-y-1">
          {categories.map((category) => {
            const active = category.id === activeId;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  title={category.name}
                  onClick={() => void select(category.id)}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-lg border-l-4 px-3 text-left text-base ${
                    active
                      ? "border-accent bg-surface-raised font-semibold text-fg"
                      : "border-transparent text-fg hover:bg-surface-raised"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  <span className="text-sm text-fg-muted" aria-label={`${category.note_count} notes`}>
                    {category.note_count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-2">
        <Button className="w-full" onClick={onAddCategory}>
          <PlusIcon />
          Add category
        </Button>
      </div>
      {dialog}
    </div>
  );
}
