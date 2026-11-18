import { useCallback, useState, type ReactNode } from "react";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { useStore } from "../state/notesStore";

interface Pending {
  targetId: string;
  failedIds: string[];
}

/**
 * Category-switch guard (FR-011, FR-012): flush unsaved notes first and switch only after
 * every save succeeded; otherwise ask the user to Retry, Discard & switch, or Cancel.
 */
export function useUnsavedGuard(): { requestSwitch: (categoryId: string) => Promise<boolean>; dialog: ReactNode } {
  const store = useStore();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const attempt = useCallback(
    async (targetId: string) => {
      setBusy(true);
      const { ok, failedIds } = await store.flushAll();
      setBusy(false);
      if (ok) {
        setPending(null);
        await store.selectCategory(targetId);
        return true;
      }
      setPending({ targetId, failedIds });
      return false;
    },
    [store],
  );

  const requestSwitch = useCallback(
    async (categoryId: string) => {
      if (categoryId === store.getState().activeCategoryId) return true;
      return attempt(categoryId);
    },
    [attempt, store],
  );

  const dialog = pending ? (
    <UnsavedChangesDialog
      failedCount={pending.failedIds.length}
      pending={busy}
      onRetry={() => void attempt(pending.targetId)}
      onDiscard={() => {
        store.discardChanges(pending.failedIds);
        setPending(null);
        void store.selectCategory(pending.targetId);
      }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  return { requestSwitch, dialog };
}
