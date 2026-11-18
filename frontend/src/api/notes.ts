import { request } from "./client";
import type { Note } from "./types";

const enc = encodeURIComponent;

export const listNotes = (categoryId: string) =>
  request<Note[]>("GET", `/categories/${enc(categoryId)}/notes`);

export const createNote = (categoryId: string, content = "") =>
  request<Note>("POST", `/categories/${enc(categoryId)}/notes`, { content });

export const updateNote = (noteId: string, content: string) =>
  request<Note>("PATCH", `/notes/${enc(noteId)}`, { content });

export const deleteNote = (noteId: string) => request<void>("DELETE", `/notes/${enc(noteId)}`);

export const reorderNotes = (categoryId: string, noteIds: string[]) =>
  request<Note[]>("PUT", `/categories/${enc(categoryId)}/notes/order`, { note_ids: noteIds });
