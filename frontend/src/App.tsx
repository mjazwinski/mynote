import { useEffect, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import { CategoryForm } from "./components/CategoryForm";
import { CategoryTabs } from "./components/CategoryTabs";
import { EmptyState } from "./components/EmptyState";
import { NoteCanvas } from "./components/NoteCanvas";
import { ThemeToggle } from "./components/ThemeToggle";
import { useBeforeUnload } from "./hooks/useBeforeUnload";
import { useUnsavedGuard } from "./hooks/useUnsavedGuard";
import { NotesStoreProvider, useNotesState, useStore, type NotesStore } from "./state/notesStore";

function ErrorBanner() {
  const store = useStore();
  const error = useNotesState((s) => s.error);
  if (!error) return null;
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-danger bg-surface-raised px-4 py-2 text-danger">
      <span className="flex-1 font-medium">{error}</span>
      <button
        type="button"
        onClick={store.clearError}
        className="min-h-11 min-w-11 rounded-lg px-2 font-medium text-fg underline"
      >
        Dismiss
      </button>
    </div>
  );
}

function AppContent() {
  const store = useStore();
  const started = useRef(false);
  const loaded = useNotesState((s) => s.categoriesLoaded);
  const hasCategories = useNotesState((s) => s.categories.length > 0);
  const hasUnsaved = useNotesState((s) => Object.values(s.notes).some((n) => n.saveState !== "saved"));
  const [creating, setCreating] = useState(false);
  const { requestSwitch, dialog } = useUnsavedGuard();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void store.init();
  }, [store]);

  useBeforeUnload(hasUnsaved);

  const sidebar = (
    <>
      <div className="border-b border-border px-4 py-3 text-lg font-bold">MyNote</div>
      <CategoryTabs onAddCategory={() => setCreating(true)} />
      <div className="border-t border-border p-2">
        <ThemeToggle />
      </div>
    </>
  );

  let main;
  if (!loaded) main = <p className="p-6 text-fg-muted">Loading…</p>;
  else if (!hasCategories) main = <EmptyState onCreate={() => setCreating(true)} />;
  else main = <NoteCanvas />;

  return (
    <AppShell sidebar={sidebar}>
      <ErrorBanner />
      {main}
      {creating && (
        <CategoryForm
          onCancel={() => setCreating(false)}
          onCreated={(category) => {
            setCreating(false);
            void requestSwitch(category.id);
          }}
        />
      )}
      {dialog}
    </AppShell>
  );
}

export function App({ store }: { store?: NotesStore }) {
  return (
    <NotesStoreProvider store={store}>
      <AppContent />
    </NotesStoreProvider>
  );
}
