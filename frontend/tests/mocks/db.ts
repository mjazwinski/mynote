// In-memory fake of the backend implementing the openapi.yaml rules (for MSW handlers).
import type { Category, Note } from "../../src/api/types";

interface StoredCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface Failure {
  status: number;
  code?: string;
  detail?: string;
  network?: boolean;
}

let counter = 0;
const nextId = () => (++counter).toString(16).padStart(24, "0");
let clock = Date.UTC(2026, 0, 1);
const now = () => new Date((clock += 1000)).toISOString();

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail);
  }
}

class MockDb {
  categories: StoredCategory[] = [];
  notes: Note[] = [];
  /** One-shot failures keyed by operation, e.g. "updateNote". */
  private failures = new Map<string, Failure[]>();
  /** Recorded requests, e.g. ["PATCH /notes/1", ...]. */
  calls: string[] = [];

  reset() {
    this.categories = [];
    this.notes = [];
    this.failures.clear();
    this.calls = [];
  }

  failNext(operation: string, failure: Failure = { status: 500 }, times = 1) {
    const list = this.failures.get(operation) ?? [];
    for (let i = 0; i < times; i++) list.push(failure);
    this.failures.set(operation, list);
  }

  takeFailure(operation: string): Failure | undefined {
    return this.failures.get(operation)?.shift();
  }

  // ---- seeding helpers ----
  seedCategory(name: string): Category {
    const cat = { id: nextId(), name, created_at: now() };
    this.categories.push(cat);
    return this.toCategory(cat);
  }

  seedNote(categoryId: string, content = ""): Note {
    return this.createNote(categoryId, content);
  }

  // ---- operations ----
  private toCategory(cat: StoredCategory): Category {
    return { ...cat, note_count: this.notes.filter((n) => n.category_id === cat.id).length };
  }

  private requireCategory(id: string): StoredCategory {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) throw new HttpError(404, "not_found", "Category not found");
    return cat;
  }

  private requireNote(id: string): Note {
    const note = this.notes.find((n) => n.id === id);
    if (!note) throw new HttpError(404, "not_found", "Note not found");
    return note;
  }

  listCategories(): Category[] {
    return this.categories.map((c) => this.toCategory(c));
  }

  createCategory(rawName: unknown): Category {
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (name.length < 1 || name.length > 50) {
      throw new HttpError(422, "validation_error", "name: must be 1-50 characters");
    }
    if (this.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, "category_name_conflict", "A category with this name already exists");
    }
    return this.seedCategory(name);
  }

  deleteCategory(id: string) {
    this.requireCategory(id);
    this.notes = this.notes.filter((n) => n.category_id !== id);
    this.categories = this.categories.filter((c) => c.id !== id);
  }

  listNotes(categoryId: string): Note[] {
    this.requireCategory(categoryId);
    return this.notes
      .filter((n) => n.category_id === categoryId)
      .sort((a, b) => a.position - b.position)
      .map((n) => ({ ...n }));
  }

  createNote(categoryId: string, content = ""): Note {
    this.requireCategory(categoryId);
    const ts = now();
    const note: Note = {
      id: nextId(),
      category_id: categoryId,
      content,
      position: this.notes.filter((n) => n.category_id === categoryId).length,
      created_at: ts,
      updated_at: ts,
    };
    this.notes.push(note);
    return { ...note };
  }

  updateNote(id: string, content: unknown): Note {
    const note = this.requireNote(id);
    if (typeof content !== "string" || content.length > 20000) {
      throw new HttpError(422, "validation_error", "content: invalid");
    }
    note.content = content;
    note.updated_at = now();
    return { ...note };
  }

  deleteNote(id: string) {
    const note = this.requireNote(id);
    this.notes = this.notes.filter((n) => n.id !== id);
    for (const n of this.notes) {
      if (n.category_id === note.category_id && n.position > note.position) n.position -= 1;
    }
  }

  reorderNotes(categoryId: string, noteIds: unknown): Note[] {
    this.requireCategory(categoryId);
    const current = this.notes.filter((n) => n.category_id === categoryId);
    const ids = Array.isArray(noteIds) ? (noteIds as string[]) : [];
    const valid =
      ids.length === current.length &&
      new Set(ids).size === ids.length &&
      current.every((n) => ids.includes(n.id));
    if (!valid) throw new HttpError(422, "invalid_note_order", "Invalid note order");
    ids.forEach((id, index) => {
      this.requireNote(id).position = index;
    });
    return this.listNotes(categoryId);
  }
}

export const mockDb = new MockDb();
