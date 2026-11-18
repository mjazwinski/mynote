// Unsaved note edits mirrored to localStorage so nothing is lost on save failure or reload
// (constitution Principle V, FR-013).

export const DRAFTS_KEY = "mynote.drafts";

export interface Draft {
  content: string;
  updatedAt: string;
}

export type Drafts = Record<string, Draft>;

function read(): Drafts {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Drafts;
  } catch {
    // corrupted data: start fresh
  }
  return {};
}

function write(drafts: Drafts) {
  try {
    if (Object.keys(drafts).length === 0) localStorage.removeItem(DRAFTS_KEY);
    else localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // storage full/unavailable: the in-memory state still holds the edit
  }
}

export const allDrafts = (): Drafts => read();

export const getDraft = (noteId: string): Draft | undefined => read()[noteId];

export function setDraft(noteId: string, content: string) {
  write({ ...read(), [noteId]: { content, updatedAt: new Date().toISOString() } });
}

export function removeDraft(noteId: string) {
  const drafts = read();
  if (!(noteId in drafts)) return;
  delete drafts[noteId];
  write(drafts);
}
