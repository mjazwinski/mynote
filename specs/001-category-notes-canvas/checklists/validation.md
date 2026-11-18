# Quickstart Validation Results: Category Notes Canvas

**Date**: 2026-11-18
**Stack**: `docker compose up --build -d` (mongo:8, backend, frontend — all healthy)
**Browsers**: Playwright Chromium at 800×1280 (touch), 1280×800 (touch), 2560×1440; light + dark
**Source**: [quickstart.md](../quickstart.md)

## Suite results

| Suite | Result |
|-------|--------|
| Backend pytest (unit, contract vs. openapi.yaml, integration on real MongoDB) | 60 passed |
| Backend `ruff check` / `complexipy` | clean / all functions within limit |
| Frontend Vitest (unit + component, MSW) | 89 passed (14 files) |
| Frontend `tsc`, ESLint, theme-token check | clean (9 cognitive-complexity warnings, each covered by unit tests — see T095) |
| Playwright e2e (3 viewports × light/dark where applicable) | 42 passed, 3 skipped by design |

Skipped by design: drag-onto-tab check in tablet portrait (the sidebar is a closed drawer, so
tabs are not on screen while dragging; covered at the other two viewports and by the `dropMove`
unit test); performance test runs only once, on the desktop project.

## Scenarios

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Fresh start (empty DB) → empty state | ✅ | e2e `data-safety` (API mocked empty), unit `CategoryForm` |
| 2 | Create "Work"; "work" rejected | ✅ | e2e `data-safety`, contract `test_categories_contract`, unit `CategoryForm` |
| 3 | Add note, type, blur, reload → Saved and kept | ✅ | e2e `navigation`, `responsive`; unit `NoteCard` |
| 4 | Edit then immediately switch tab → saved; canvases isolated | ✅ | e2e `navigation`; unit `useUnsavedGuard` |
| 5 | Backend down → Save failed, Retry/Discard/Cancel dialog, draft survives reload, retry saves | ✅ | e2e `data-safety` (requests blocked); unit `NoteCard`, `useUnsavedGuard` |
| 6 | Close tab with unsaved edits → leave confirmation | ✅ | e2e `data-safety` (`beforeunload` dialog); unit `useBeforeUnload` |
| 7 | Delete note: Cancel / Confirm | ✅ | unit `delete.test`, e2e `responsive`; contract `test_delete_contract` |
| 8 | Remove empty / non-empty category, warning with count, next tab or empty state | ✅ | unit `delete.test`, e2e `responsive` (warning "contains 3 notes"), contract cascade tests |
| 9 | Drag last → first (mouse + touch), Move up, reload keeps order | ✅ | e2e `reorder` (mouse on desktop, CDP touch on tablets); unit `reorder.test`; contract `test_reorder_contract` |
| 10 | Drop note on another category tab → unchanged | ✅ | e2e `reorder`; unit `dropMove`; contract rejects cross-category IDs |
| 11 | Theme toggle, persistence, OS default | ✅ | e2e `theme`; unit `useTheme` |
| 12 | Scenarios 3/8/9 at all viewports, both themes; no overflow; ≥ 44 px targets; AA contrast | ✅ | e2e `responsive` (axe `color-contrast`, touch-target and overflow assertions) |

## Success criteria

| SC | Result |
|----|--------|
| SC-004 canvas switch < 1 s with 200 notes | ✅ 505–622 ms measured (e2e `performance`) |
| SC-005 every delete confirmed; non-empty category warning | ✅ |
| SC-006 reordered order identical after reload | ✅ |
| SC-007 usable at tablet + 27″, both themes | ✅ |

## Findings fixed during validation

- PyMongo DEBUG command logs would have written note content to the logs when
  `LOG_LEVEL=DEBUG`; the `pymongo` logger is now capped at WARNING (test
  `test_logging_privacy.py`).
- uvicorn's access log duplicated the JSON access log; capped at WARNING.
- Escape now closes the tablet sidebar drawer (found by the theme e2e test in portrait).
