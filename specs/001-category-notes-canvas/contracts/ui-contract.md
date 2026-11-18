# UI Contract: Category Notes Canvas

Observable UI behaviour the frontend MUST provide (used by component and e2e tests).
Endpoint references point to [openapi.yaml](./openapi.yaml).

## Layout

| Region | Content | Responsive rule |
|--------|---------|-----------------|
| Left sidebar | Vertical category tabs (creation order), "Add category" button, theme toggle | Always visible ≥ 1024 px wide; collapsible drawer (toggle button) below that, e.g. tablet portrait |
| Main area | Active category canvas: header (category name, "Add note", "Remove category"), responsive grid of note cards | Grid columns scale from 1 (narrow) to 4–6 (27″); cards keep readable width |

All interactive targets ≥ 44×44 CSS px; nothing relies on hover only.

## Components & behaviour

| Element | Behaviour | Spec |
|---------|-----------|------|
| Category tab | Click/tap → unsaved guard → open canvas; active tab has `aria-current="page"` | FR-002–FR-003, FR-011 |
| Add category | Opens inline form/dialog; validates 1–50 chars; shows server `409` as "name already exists" | FR-001 |
| Empty state | Shown when no categories; contains "Create your first category" action | FR-005 |
| Add note | `POST …/notes`; new card appended and focused | FR-006 |
| Note card | Editable textarea; save indicator (`Saved`, `Unsaved`, `Saving…`, `Save failed – Retry`); delete button; drag handle; move up/down buttons | FR-007, FR-009–FR-010, FR-020–FR-021 |
| Note blur | If dirty → `PATCH /notes/{id}` | FR-009 |
| Delete note | Confirm dialog "Delete this note?" → `DELETE /notes/{id}` | FR-015 |
| Remove category | Confirm dialog "Remove category “{name}”?"; if `note_count > 0` add warning block (`role="alert"`): "This category contains {n} note(s). They will be permanently deleted." | FR-016–FR-019 |
| Unsaved-switch dialog | Shown when flush fails on tab switch: **Retry**, **Discard changes & switch**, **Cancel** | FR-012 |
| Theme toggle | Toggles `dark` class on `<html>`, persists `mynote.theme` | FR-023 |
| Page unload | `beforeunload` prompt while any note is not `saved` | FR-014 |

## Confirm dialog

Modal with focus trap, `role="alertdialog"`, Escape = Cancel, default focus on **Cancel**,
destructive button styled with the `danger` token.

## Theme tokens (CSS custom properties)

`--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-fg`, `--color-fg-muted`,
`--color-border`, `--color-accent`, `--color-accent-fg`, `--color-danger`, `--color-danger-fg`,
`--color-focus`. Defined for `:root` (light) and `.dark`; all text pairs meet WCAG 2.1 AA.
