/**
 * Client state for categories and the notes of the active category.
 *
 * A pure `reducer` (unit-testable) runs inside a tiny external store so async actions always
 * read the latest state synchronously; React subscribes via useSyncExternalStore.
 *
 * Note save-state machine (data-model.md):
 *   saved --edit--> dirty --blur/flush--> saving --ok--> saved
 *                                         saving --error--> error
 *   error --edit--> dirty   error --retry--> saving   error --discard--> saved
 */
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import * as categoriesApi from "../api/categories";
import * as notesApi from "../api/notes";
import { ApiError } from "../api/client";
import type { Category, Note } from "../api/types";
import { allDrafts, removeDraft, setDraft, type Drafts } from "./drafts";

export type SaveState = "saved" | "dirty" | "saving" | "error";

export interface NoteState {
  note: Note;
  serverContent: string;
  content: string;
  saveState: SaveState;
}

export interface State {
  categoriesLoaded: boolean;
  categories: Category[];
  activeCategoryId: string | null;
  notesLoading: boolean;
  notes: Record<string, NoteState>;
  order: string[];
  focusNoteId: string | null;
  error: string | null;
}

export const initialState: State = {
  categoriesLoaded: false,
  categories: [],
  activeCategoryId: null,
  notesLoading: false,
  notes: {},
  order: [],
  focusNoteId: null,
  error: null,
};

export type Action =
  | { type: "categoriesLoaded"; categories: Category[] }
  | { type: "categoryAdded"; category: Category }
  | { type: "categoryRemoved"; id: string }
  | { type: "activeCategorySet"; id: string | null }
  | { type: "notesLoaded"; categoryId: string; notes: Note[]; drafts: Drafts }
  | { type: "noteAdded"; note: Note }
  | { type: "noteEdited"; id: string; content: string }
  | { type: "saveStarted"; id: string }
  | { type: "saveSucceeded"; id: string; note: Note; sentContent: string }
  | { type: "saveFailed"; id: string }
  | { type: "changesDiscarded"; ids: string[] }
  | { type: "noteRemoved"; id: string }
  | { type: "orderChanged"; order: string[] }
  | { type: "focusHandled" }
  | { type: "errorShown"; message: string }
  | { type: "errorCleared" };

function updateNote(state: State, id: string, patch: (n: NoteState) => NoteState): State {
  const current = state.notes[id];
  if (!current) return state;
  return { ...state, notes: { ...state.notes, [id]: patch(current) } };
}

function adjustNoteCount(categories: Category[], categoryId: string, delta: number): Category[] {
  return categories.map((c) =>
    c.id === categoryId ? { ...c, note_count: Math.max(0, c.note_count + delta) } : c,
  );
}

function toNoteState(note: Note, drafts: Drafts): NoteState {
  const draft = drafts[note.id];
  const content = draft?.content ?? note.content;
  return {
    note,
    serverContent: note.content,
    content,
    saveState: content === note.content ? "saved" : "dirty",
  };
}

function withoutNote(state: State, id: string): State {
  const target = state.notes[id];
  if (!target) return state;
  const notes = { ...state.notes };
  delete notes[id];
  return {
    ...state,
    notes,
    order: state.order.filter((n) => n !== id),
    categories: adjustNoteCount(state.categories, target.note.category_id, -1),
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "categoriesLoaded":
      return { ...state, categoriesLoaded: true, categories: action.categories };
    case "categoryAdded":
      return { ...state, categories: [...state.categories, action.category] };
    case "categoryRemoved":
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };
    case "activeCategorySet":
      return {
        ...state,
        activeCategoryId: action.id,
        notesLoading: action.id !== null,
        notes: {},
        order: [],
        focusNoteId: null,
      };
    case "notesLoaded": {
      if (action.categoryId !== state.activeCategoryId) return state;
      const notes: Record<string, NoteState> = {};
      for (const n of action.notes) notes[n.id] = toNoteState(n, action.drafts);
      return { ...state, notesLoading: false, notes, order: action.notes.map((n) => n.id) };
    }
    case "noteAdded":
      if (action.note.category_id !== state.activeCategoryId) return state;
      return {
        ...state,
        notes: { ...state.notes, [action.note.id]: toNoteState(action.note, {}) },
        order: [...state.order, action.note.id],
        focusNoteId: action.note.id,
        categories: adjustNoteCount(state.categories, action.note.category_id, 1),
      };
    case "noteEdited":
      return updateNote(state, action.id, (n) => ({
        ...n,
        content: action.content,
        saveState:
          n.saveState === "saving"
            ? "saving"
            : action.content === n.serverContent
              ? "saved"
              : "dirty",
      }));
    case "saveStarted":
      return updateNote(state, action.id, (n) => ({ ...n, saveState: "saving" }));
    case "saveSucceeded":
      return updateNote(state, action.id, (n) => ({
        ...n,
        note: action.note,
        serverContent: action.sentContent,
        saveState: n.content === action.sentContent ? "saved" : "dirty",
      }));
    case "saveFailed":
      return updateNote(state, action.id, (n) => ({ ...n, saveState: "error" }));
    case "changesDiscarded":
      return action.ids.reduce(
        (s, id) =>
          updateNote(s, id, (n) => ({ ...n, content: n.serverContent, saveState: "saved" })),
        state,
      );
    case "noteRemoved":
      return withoutNote(state, action.id);
    case "orderChanged":
      return { ...state, order: action.order };
    case "focusHandled":
      return { ...state, focusNoteId: null };
    case "errorShown":
      return { ...state, error: action.message };
    case "errorCleared":
      return { ...state, error: null };
  }
}

export const LAST_CATEGORY_KEY = "mynote.lastCategoryId";

function rememberCategory(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_CATEGORY_KEY, id);
    else localStorage.removeItem(LAST_CATEGORY_KEY);
  } catch {
    // storage unavailable
  }
}

function recalledCategory(): string | null {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY);
  } catch {
    return null;
  }
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.status !== 0 ? `${fallback}: ${err.detail}` : fallback;

/** Note ids that are not fully saved (dirty, saving or error). */
export const unsavedNoteIds = (state: State) =>
  state.order.filter((id) => state.notes[id]?.saveState !== "saved");

export function createNotesStore() {
  let state = initialState;
  const listeners = new Set<() => void>();
  const inFlight = new Map<string, Promise<boolean>>();

  const getState = () => state;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const dispatch = (action: Action) => {
    state = reducer(state, action);
    listeners.forEach((l) => l());
  };

  async function loadNotes(categoryId: string) {
    try {
      const notes = await notesApi.listNotes(categoryId);
      dispatch({ type: "notesLoaded", categoryId, notes, drafts: allDrafts() });
    } catch (err) {
      dispatch({ type: "notesLoaded", categoryId, notes: [], drafts: {} });
      dispatch({ type: "errorShown", message: errorMessage(err, "Could not load notes") });
    }
  }

  async function selectCategory(id: string | null) {
    dispatch({ type: "activeCategorySet", id });
    rememberCategory(id);
    if (id) await loadNotes(id);
  }

  async function init() {
    try {
      const categories = await categoriesApi.listCategories();
      dispatch({ type: "categoriesLoaded", categories });
      const last = recalledCategory();
      const initial = categories.find((c) => c.id === last) ?? categories[0];
      await selectCategory(initial?.id ?? null);
    } catch (err) {
      dispatch({ type: "categoriesLoaded", categories: [] });
      dispatch({ type: "errorShown", message: errorMessage(err, "Could not load categories") });
    }
  }

  async function addCategory(name: string): Promise<Category> {
    const category = await categoriesApi.createCategory(name);
    dispatch({ type: "categoryAdded", category });
    return category;
  }

  async function addNote() {
    const categoryId = state.activeCategoryId;
    if (!categoryId) return;
    try {
      dispatch({ type: "noteAdded", note: await notesApi.createNote(categoryId) });
    } catch (err) {
      dispatch({ type: "errorShown", message: errorMessage(err, "Could not add the note") });
    }
  }

  function editNote(id: string, content: string) {
    dispatch({ type: "noteEdited", id, content });
    const n = state.notes[id];
    if (n && n.content !== n.serverContent) setDraft(id, content);
    else removeDraft(id);
  }

  async function performSave(id: string): Promise<boolean> {
    const current = state.notes[id];
    if (!current || current.saveState === "saved") return true;
    const sentContent = current.content;
    dispatch({ type: "saveStarted", id });
    try {
      const note = await notesApi.updateNote(id, sentContent);
      dispatch({ type: "saveSucceeded", id, note, sentContent });
      if (state.notes[id]?.saveState === "saved") removeDraft(id);
      return true;
    } catch {
      dispatch({ type: "saveFailed", id });
      return false;
    }
  }

  /** Save a note if it has unsaved changes. Concurrent calls are serialized per note. */
  async function saveNote(id: string): Promise<boolean> {
    const pending = inFlight.get(id);
    if (pending) await pending;
    const promise = performSave(id);
    inFlight.set(id, promise);
    try {
      const ok = await promise;
      // Edited again while saving → persist the newer content too.
      return ok && state.notes[id]?.saveState === "dirty" ? saveNote(id) : ok;
    } finally {
      if (inFlight.get(id) === promise) inFlight.delete(id);
    }
  }

  /** Save every unsaved note of the active category (used before switching categories). */
  async function flushAll(): Promise<{ ok: boolean; failedIds: string[] }> {
    const ids = unsavedNoteIds(state);
    const results = await Promise.all(ids.map((id) => saveNote(id)));
    const failedIds = ids.filter((_, i) => !results[i]);
    return { ok: failedIds.length === 0, failedIds };
  }

  function discardChanges(ids: string[]) {
    dispatch({ type: "changesDiscarded", ids });
    ids.forEach(removeDraft);
  }

  async function deleteNote(id: string) {
    await notesApi.deleteNote(id);
    dispatch({ type: "noteRemoved", id });
    removeDraft(id);
  }

  async function deleteCategory(id: string) {
    const index = state.categories.findIndex((c) => c.id === id);
    await categoriesApi.deleteCategory(id);
    const wasActive = state.activeCategoryId === id;
    if (wasActive) Object.keys(state.notes).forEach(removeDraft);
    dispatch({ type: "categoryRemoved", id });
    if (!wasActive) return;
    const remaining = state.categories;
    const next = remaining[Math.min(index, remaining.length - 1)] ?? null;
    await selectCategory(next?.id ?? null);
  }

  async function reorder(fromIndex: number, toIndex: number) {
    const categoryId = state.activeCategoryId;
    const previous = state.order;
    if (!categoryId || fromIndex === toIndex || toIndex < 0 || toIndex >= previous.length) return;
    const order = [...previous];
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    dispatch({ type: "orderChanged", order });
    try {
      await notesApi.reorderNotes(categoryId, order);
    } catch (err) {
      if (state.activeCategoryId === categoryId) dispatch({ type: "orderChanged", order: previous });
      dispatch({ type: "errorShown", message: errorMessage(err, "Could not reorder notes") });
    }
  }

  return {
    getState,
    subscribe,
    dispatch,
    init,
    selectCategory,
    addCategory,
    addNote,
    editNote,
    saveNote,
    flushAll,
    discardChanges,
    deleteNote,
    deleteCategory,
    reorder,
    clearError: () => dispatch({ type: "errorCleared" }),
    focusHandled: () => dispatch({ type: "focusHandled" }),
  };
}

export type NotesStore = ReturnType<typeof createNotesStore>;

const StoreContext = createContext<NotesStore | null>(null);

export function NotesStoreProvider({ store, children }: { store?: NotesStore; children: ReactNode }) {
  const [value] = useState(() => store ?? createNotesStore());
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): NotesStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside NotesStoreProvider");
  return store;
}

export function useNotesState<T>(selector: (state: State) => T): T {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
