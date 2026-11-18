// Mirrors specs/001-category-notes-canvas/contracts/openapi.yaml

export interface Category {
  id: string;
  name: string;
  created_at: string;
  note_count: number;
}

export interface Note {
  id: string;
  category_id: string;
  content: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ApiErrorBody {
  detail: string;
  code?: string;
}

export const CATEGORY_NAME_MAX = 50;
export const NOTE_CONTENT_MAX = 20000;
