# Data Model: Category Notes Canvas

**Feature**: [spec.md](./spec.md) | **Date**: 2026-11-18 | **Database**: MongoDB (db `mynote`)

## Collection `categories`

| Field        | Type       | Rules                                                         |
|--------------|------------|---------------------------------------------------------------|
| `_id`        | ObjectId   | Primary key; exposed as string `id`.                          |
| `name`       | string     | Required; trimmed; length 1–50.                               |
| `name_key`   | string     | `name.casefold()`; unique index → case-insensitive uniqueness. |
| `created_at` | datetime   | UTC, set on insert. Tabs are ordered by this (FR-002).        |

**Indexes**: `{ name_key: 1 }` unique; `{ created_at: 1 }`.

## Collection `notes`

| Field         | Type     | Rules                                                              |
|---------------|----------|--------------------------------------------------------------------|
| `_id`         | ObjectId | Primary key; exposed as string `id`.                               |
| `category_id` | ObjectId | Required; references `categories._id`; immutable after creation (FR-008). |
| `content`     | string   | Plain text; may be empty; max 20 000 characters.                   |
| `position`    | int      | 0-based order within category; contiguous 0..n-1 after each write. |
| `created_at`  | datetime | UTC, set on insert.                                                |
| `updated_at`  | datetime | UTC, set on insert and every content update.                       |

**Indexes**: `{ category_id: 1, position: 1 }`.

## Relationships

- Category 1 — 0..* Note. Deleting a category deletes all its notes (notes first, then the
  category; see research R6).
- A note's `category_id` never changes; no endpoint accepts it on update.

## Validation & business rules

| Rule | Enforcement |
|------|-------------|
| Category name 1–50 chars after trim | Pydantic schema → `422` |
| Category name unique (case-insensitive) | Unique index on `name_key` → `409` |
| Note created in existing category | Service check → `404` if category missing |
| New note appended at end | `position = count(notes in category)` |
| Reorder only within category | Request list MUST equal the category's note-ID set exactly → else `422` |
| After delete of a note | Positions of following notes decremented (kept contiguous) |
| Content max length | Pydantic schema → `422` |

## Client-side state (frontend, not persisted on server)

| Key / state | Storage | Purpose |
|-------------|---------|---------|
| `mynote.theme` | localStorage | `"light"` \| `"dark"`; absent → follow system (FR-023) |
| `mynote.lastCategoryId` | localStorage | Reopen last active category (FR-004) |
| `mynote.drafts` | localStorage | `{ [noteId]: { content, updatedAt } }` unsaved edits (FR-013) |
| `saveState` per note | memory | State machine below (FR-010) |

### Note save-state transitions

```text
saved --edit--> dirty --blur / flush--> saving --200--> saved
                                         saving --error--> error
error --edit--> dirty      error --retry--> saving      error --discard--> saved (server value)
```

A category switch is allowed only when every note on the current canvas is `saved`
(after flushing), or the user explicitly chooses "Discard & switch".
