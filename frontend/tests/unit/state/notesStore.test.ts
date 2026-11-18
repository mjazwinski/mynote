import { describe, expect, it } from "vitest";
import type { Note } from "../../../src/api/types";
import { createNotesStore, initialState, reducer } from "../../../src/state/notesStore";
import { setDraft } from "../../../src/state/drafts";
import { mockDb } from "../../mocks/db";

const note = (id: string, content = "", position = 0): Note => ({
  id,
  category_id: "c1",
  content,
  position,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const active = reducer(initialState, { type: "activeCategorySet", id: "c1" });

const loaded = reducer(active, {
  type: "notesLoaded",
  categoryId: "c1",
  notes: [note("n1", "server")],
  drafts: {},
});

describe("notes reducer – save state machine", () => {
  it("saved → dirty on edit", () => {
    const s = reducer(loaded, { type: "noteEdited", id: "n1", content: "new" });
    expect(s.notes.n1.saveState).toBe("dirty");
  });

  it("editing back to the server value returns to saved", () => {
    let s = reducer(loaded, { type: "noteEdited", id: "n1", content: "new" });
    s = reducer(s, { type: "noteEdited", id: "n1", content: "server" });
    expect(s.notes.n1.saveState).toBe("saved");
  });

  it("dirty → saving → saved", () => {
    let s = reducer(loaded, { type: "noteEdited", id: "n1", content: "new" });
    s = reducer(s, { type: "saveStarted", id: "n1" });
    expect(s.notes.n1.saveState).toBe("saving");
    s = reducer(s, { type: "saveSucceeded", id: "n1", note: note("n1", "new"), sentContent: "new" });
    expect(s.notes.n1.saveState).toBe("saved");
    expect(s.notes.n1.serverContent).toBe("new");
  });

  it("stays dirty when edited while saving", () => {
    let s = reducer(loaded, { type: "noteEdited", id: "n1", content: "new" });
    s = reducer(s, { type: "saveStarted", id: "n1" });
    s = reducer(s, { type: "noteEdited", id: "n1", content: "newer" });
    s = reducer(s, { type: "saveSucceeded", id: "n1", note: note("n1", "new"), sentContent: "new" });
    expect(s.notes.n1.saveState).toBe("dirty");
    expect(s.notes.n1.content).toBe("newer");
  });

  it("saving → error, error → dirty on edit, error → saving on retry", () => {
    let s = reducer(loaded, { type: "noteEdited", id: "n1", content: "new" });
    s = reducer(s, { type: "saveStarted", id: "n1" });
    s = reducer(s, { type: "saveFailed", id: "n1" });
    expect(s.notes.n1.saveState).toBe("error");
    expect(reducer(s, { type: "noteEdited", id: "n1", content: "x" }).notes.n1.saveState).toBe(
      "dirty",
    );
    expect(reducer(s, { type: "saveStarted", id: "n1" }).notes.n1.saveState).toBe("saving");
  });

  it("discard restores the server content", () => {
    let s = reducer(loaded, { type: "noteEdited", id: "n1", content: "new" });
    s = reducer(s, { type: "changesDiscarded", ids: ["n1"] });
    expect(s.notes.n1).toMatchObject({ content: "server", saveState: "saved" });
  });

  it("a restored draft becomes dirty on load", () => {
    const s = reducer(active, {
      type: "notesLoaded",
      categoryId: "c1",
      notes: [note("n1", "server")],
      drafts: { n1: { content: "draft", updatedAt: "2026-01-02T00:00:00Z" } },
    });
    expect(s.notes.n1).toMatchObject({ content: "draft", saveState: "dirty" });
  });

  it("ignores notesLoaded for a category that is no longer active", () => {
    const other = reducer(initialState, { type: "activeCategorySet", id: "c2" });
    const s = reducer(other, { type: "notesLoaded", categoryId: "c1", notes: [note("n1")], drafts: {} });
    expect(s.order).toEqual([]);
  });
});

describe("notes store – actions against the mock API", () => {
  it("loads categories and notes, merging drafts", async () => {
    const cat = mockDb.seedCategory("Work");
    const n = mockDb.seedNote(cat.id, "server");
    setDraft(n.id, "unsaved draft");
    const store = createNotesStore();
    await store.init();
    expect(store.getState().activeCategoryId).toBe(cat.id);
    expect(store.getState().notes[n.id]).toMatchObject({ content: "unsaved draft", saveState: "dirty" });
  });

  it("saveNote persists, clears the draft, and reports failures", async () => {
    const cat = mockDb.seedCategory("Work");
    const n = mockDb.seedNote(cat.id, "a");
    const store = createNotesStore();
    await store.init();

    store.editNote(n.id, "b");
    expect(localStorage.getItem("mynote.drafts")).toContain('"b"');
    await expect(store.saveNote(n.id)).resolves.toBe(true);
    expect(store.getState().notes[n.id].saveState).toBe("saved");
    expect(localStorage.getItem("mynote.drafts") ?? "").not.toContain('"b"');

    mockDb.failNext("updateNote");
    store.editNote(n.id, "c");
    await expect(store.saveNote(n.id)).resolves.toBe(false);
    expect(store.getState().notes[n.id].saveState).toBe("error");
    expect(localStorage.getItem("mynote.drafts")).toContain('"c"');
  });

  it("saveNote is a no-op for a saved note", async () => {
    const cat = mockDb.seedCategory("Work");
    const n = mockDb.seedNote(cat.id, "a");
    const store = createNotesStore();
    await store.init();
    mockDb.calls = [];
    await store.saveNote(n.id);
    expect(mockDb.calls).toEqual([]);
  });
});

describe("notes store – concurrency and lifecycle", () => {
  it("re-saves when the note is edited while a save is in flight", async () => {
    const cat = mockDb.seedCategory("Work");
    const n = mockDb.seedNote(cat.id, "a");
    const store = createNotesStore();
    await store.init();
    store.editNote(n.id, "first");
    const saving = store.saveNote(n.id);
    store.editNote(n.id, "second");
    await expect(saving).resolves.toBe(true);
    expect(mockDb.notes[0].content).toBe("second");
    expect(store.getState().notes[n.id].saveState).toBe("saved");
  });

  it("flushAll reports the notes that failed to save", async () => {
    const cat = mockDb.seedCategory("Work");
    const a = mockDb.seedNote(cat.id, "a");
    const b = mockDb.seedNote(cat.id, "b");
    const store = createNotesStore();
    await store.init();
    store.editNote(a.id, "a2");
    store.editNote(b.id, "b2");
    mockDb.failNext("updateNote");
    const result = await store.flushAll();
    expect(result.ok).toBe(false);
    expect(result.failedIds).toHaveLength(1);
  });

  it("deleting a non-active category keeps the current canvas", async () => {
    const work = mockDb.seedCategory("Work");
    const other = mockDb.seedCategory("Other");
    const store = createNotesStore();
    await store.init();
    await store.deleteCategory(other.id);
    expect(store.getState().activeCategoryId).toBe(work.id);
    expect(store.getState().categories.map((c) => c.name)).toEqual(["Work"]);
  });

  it("shows an error when categories cannot be loaded", async () => {
    mockDb.failNext("listCategories", { status: 503, detail: "db down" });
    const store = createNotesStore();
    await store.init();
    expect(store.getState().categoriesLoaded).toBe(true);
    expect(store.getState().error).toMatch(/Could not load categories/);
  });
});
