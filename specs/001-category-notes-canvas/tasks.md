---

description: "Task list for Category Notes Canvas"
---

# Tasks: Category Notes Canvas

**Input**: Design documents from `/specs/001-category-notes-canvas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. The constitution requires unit tests for frontend and backend, a unit test
for every function/component with cognitive complexity > 3, API + persistence tests, and tests of
auto-save and the unsaved-data check. Within each story, write tests first and confirm they fail.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested
independently. Every phase ends with a **Checkpoint**. Larger phases also have intermediate
checkpoints (🔶) after the backend part.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1–US5, see spec.md)
- Paths are relative to the repository root (`backend/`, `frontend/`, per plan.md)

## Already done (created during `/speckit-plan`)

These exist and MUST NOT be recreated. Adjust them only if a task below says so:
`docker-compose.yml`, `.env.example`, `backend/Dockerfile`, `backend/.dockerignore`,
`frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx/default.conf.template`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Create the directory layout from plan.md: `backend/src/mynote/{schemas,repositories,services,api}/`, `backend/tests/{unit,integration,contract}/`, `frontend/src/{api,state,hooks,components,styles}/`, `frontend/tests/{unit,e2e,mocks}/` (add `__init__.py` to every Python package directory)
- [X] T002 Create `backend/pyproject.toml`: project `mynote`, `requires-python = ">=3.12"`, build backend hatchling with package `src/mynote`; runtime deps `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `pydantic-settings`, `pymongo>=4.13`; extra `dev` = `pytest`, `pytest-asyncio`, `httpx`, `asgi-lifespan`, `testcontainers[mongodb]`, `jsonschema`, `pyyaml`, `ruff`, `complexipy`; `[tool.pytest.ini_options] asyncio_mode = "auto"`, `testpaths = ["tests"]`; `[tool.ruff]` target `py312`, line length 100
- [X] T003 [P] Create `backend/src/mynote/__init__.py` exposing `__version__ = "1.0.0"`
- [X] T004 [P] Create `frontend/package.json` (private, `"type": "module"`) with deps `react@19`, `react-dom@19`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; devDeps `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss@4`, `@tailwindcss/vite`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-sonarjs`, `@types/react`, `@types/react-dom`; scripts `dev`, `build` (`tsc -b && vite build`), `test` (`vitest run`), `lint`, `e2e` (`playwright test`); then run `npm install` to generate `frontend/package-lock.json` (required by `frontend/Dockerfile`)
- [X] T005 [P] Create `frontend/vite.config.ts` (plugins react + tailwind; dev server proxy `/api` → `http://localhost:8000`; vitest `environment: "jsdom"`, `setupFiles: ["tests/setup.ts"]`, `include: ["tests/unit/**/*.test.{ts,tsx}"]`) and `frontend/tsconfig.json` (strict, `jsx: react-jsx`, ES2022)
- [X] T006 [P] Create `frontend/eslint.config.js` with typescript-eslint, react-hooks, and `sonarjs/cognitive-complexity: ["warn", 3]` to flag code that the constitution says needs a unit test
- [X] T007 [P] Create `frontend/playwright.config.ts`: `baseURL` from `E2E_BASE_URL` (default `http://localhost:8080`), `testDir: "tests/e2e"`, projects `tablet-portrait` (800×1280, `hasTouch`), `tablet-landscape` (1280×800, `hasTouch`), `desktop-27` (2560×1440)
- [X] T008 [P] Create root `.gitignore` (`.env`, `node_modules/`, `dist/`, `__pycache__/`, `.venv/`, `.pytest_cache/`, `playwright-report/`, `test-results/`, `coverage/`)

**Checkpoint**: `cd backend && pip install -e ".[dev]"` and `cd frontend && npm ci` both succeed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: App skeletons, logging, DB access, theme tokens, API client, layout shell. Every
user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend foundation

- [X] T009 Implement `backend/src/mynote/config.py`: pydantic-settings `Settings` with `MONGODB_URI` (default `mongodb://localhost:27017`), `MONGODB_DB` (default `mynote`), `LOG_LEVEL` (default `INFO`), `CORS_ORIGINS` (list, default `["http://localhost:5173"]`); cached `get_settings()`
- [X] T010 [P] Implement `backend/src/mynote/logging_config.py` (research R4): `request_id_var: ContextVar[str | None]`; `JsonFormatter(logging.Formatter)` emitting one JSON line with `timestamp` (ISO-8601 UTC), `level`, `logger`, `message`, `request_id`, every `extra={...}` key, and `exc_info` as a string when present; `RequestIdFilter` that copies `request_id_var` into records; `configure_logging(level)` using `logging.config.dictConfig` with one stdout handler for root, `uvicorn`, `uvicorn.error`, `uvicorn.access`
- [X] T011 [P] Unit tests in `backend/tests/unit/test_logging_config.py`: output is valid JSON, includes extras, includes `request_id` from the context var, renders exceptions, honours level
- [X] T012 [P] Implement `backend/src/mynote/errors.py`: domain exceptions `NotFoundError`, `ConflictError`, `DomainValidationError` (each with `code` + `detail`) and `register_exception_handlers(app)` mapping them to 404/409/422 with body `{"detail", "code"}`; also map FastAPI `RequestValidationError` to 422 `{"detail", "code": "validation_error"}`; log 4xx at WARNING and unhandled errors at ERROR
- [X] T013 Implement `backend/src/mynote/middleware.py`: ASGI/Starlette middleware that takes `X-Request-ID` from the request or generates a UUID4, sets `request_id_var`, returns it in the `X-Request-ID` response header, and logs `request.completed` with `method`, `path`, `status`, `duration_ms` (depends on T010)
- [X] T014 [P] Implement `backend/src/mynote/db.py`: create/close `pymongo.AsyncMongoClient` from settings, `get_db()` FastAPI dependency returning the `AsyncDatabase`, `ensure_indexes(db)` creating `categories: {name_key: 1} unique`, `categories: {created_at: 1}`, `notes: {category_id: 1, position: 1}` (data-model.md), `ping(db)`
- [X] T015 [P] Implement `backend/src/mynote/schemas/common.py`: `PyObjectId` string type validated by `^[a-f0-9]{24}$`, `to_object_id(value)` raising `NotFoundError` for malformed IDs (invalid IDs → 404), and a `utcnow()` helper
- [X] T016 Implement `backend/src/mynote/api/health.py`: `GET /health` → ping Mongo → `200 {"status": "ok"}`, or 503 `{"detail", "code": "database_unavailable"}`
- [X] T017 Implement `backend/src/mynote/main.py`: `create_app()` calls `configure_logging`, defines a lifespan (open the client, `ensure_indexes`, log `app.started`, close on shutdown), adds CORS (`CORS_ORIGINS`), the request-ID middleware and the exception handlers, and mounts routers under `/api/v1`; module-level `app = create_app()` (matches `uvicorn mynote.main:app` in `backend/Dockerfile`)
- [X] T018 Create `backend/tests/conftest.py`: session-scoped MongoDB (use `MONGODB_URI` env if set, else `testcontainers.mongodb.MongoDbContainer("mongo:8")`); per-test unique database name, dropped after the test; `client` fixture = `httpx.AsyncClient(transport=ASGITransport(app), base_url="http://test")` wrapped in `asgi_lifespan.LifespanManager`, with settings overridden to the test DB
- [X] T019 [P] Create `backend/tests/contract/openapi_validator.py`: load `specs/001-category-notes-canvas/contracts/openapi.yaml` (path resolved relative to the repo root) and expose `assert_matches(schema_name, payload)` / `assert_list_of(schema_name, payload)` using `jsonschema` with `$ref` resolution
- [X] T020 [P] Integration test `backend/tests/integration/test_health.py`: `/api/v1/health` returns 200 `{"status":"ok"}` and the `X-Request-ID` response header is present

🔶 **Checkpoint (backend foundation)**: `pytest` passes; `docker compose up --build mongo backend` → backend healthy; `docker compose logs backend` shows JSON lines.

### Frontend foundation

- [X] T021 [P] Create `frontend/src/styles/theme.css` with CSS custom properties `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-fg`, `--color-fg-muted`, `--color-border`, `--color-accent`, `--color-accent-fg`, `--color-danger`, `--color-danger-fg`, `--color-focus` for `:root` (light) and `.dark` (dark); every text/background pair MUST meet WCAG 2.1 AA (≥ 4.5:1)
- [X] T022 [P] Create `frontend/src/styles/index.css`: `@import "tailwindcss";`, `@import "./theme.css";`, `@custom-variant dark (&:where(.dark, .dark *));`, and `@theme` mapping the tokens to Tailwind colors (`bg`, `surface`, `surface-raised`, `fg`, `fg-muted`, `border`, `accent`, `accent-fg`, `danger`, `danger-fg`, `focus`) so components use only `bg-surface`, `text-fg` etc. (constitution III: no hard-coded colors)
- [X] T023 [P] Create `frontend/index.html` with `<div id="root">` and an inline pre-paint script: if `localStorage["mynote.theme"]` is `"dark"`, or it is absent and `prefers-color-scheme: dark` matches, add class `dark` to `<html>` (research R9)
- [X] T024 [P] Create `frontend/src/api/types.ts` mirroring the openapi schemas: `Category {id, name, created_at, note_count}`, `Note {id, category_id, content, position, created_at, updated_at}`, `ApiErrorBody {detail, code?}`
- [X] T025 [P] Implement `frontend/src/api/client.ts`: `request<T>(method, path, body?)` with base `/api/v1`, JSON headers, 204 → `undefined`; throws `ApiError {status, code, detail}`; network failure → `ApiError` with `status: 0`, `code: "network_error"`
- [X] T026 [P] Create the MSW test infrastructure: `frontend/tests/mocks/db.ts` (in-memory categories/notes implementing the openapi rules), `frontend/tests/mocks/handlers.ts` (handlers for all 9 operations), `frontend/tests/mocks/server.ts`, and `frontend/tests/setup.ts` (jest-dom, start/reset/close the server, clear `localStorage` between tests)
- [X] T027 [P] Unit test `frontend/tests/unit/api/client.test.ts`: success, 204, error body mapping, network error
- [X] T028 [P] Implement `frontend/src/components/Modal.tsx`: accessible modal (prop `role` = `dialog` | `alertdialog`, `aria-labelledby`, focus trap, Escape → `onClose`, `initialFocusRef`, restores focus on close, token colours only) + test `frontend/tests/unit/components/Modal.test.tsx`
- [X] T029 [P] Implement `frontend/src/components/Button.tsx` with variants `primary`, `secondary`, `danger`, `ghost`; min size 44×44 CSS px (`min-h-11 min-w-11`); visible focus ring using the `focus` token
- [X] T030 Implement `frontend/src/components/AppShell.tsx`: left sidebar slot + main slot; sidebar always visible at ≥ 1024 px, below that a drawer opened by a menu button (44 px) and closed by selecting or by an overlay tap; fluid widths, no hover-only behaviour + test `frontend/tests/unit/components/AppShell.test.tsx`
- [X] T031 Create `frontend/src/main.tsx` and `frontend/src/App.tsx` that render `AppShell` with placeholder sidebar/main content and import `styles/index.css`

**Checkpoint (foundation ready)**: `pytest`, `npm test`, `npm run build` pass; `cp .env.example .env` (set password) → `docker compose up --build -d` → `mongo`, `backend`, `frontend` all healthy; http://localhost:8080 shows the empty shell; `curl http://localhost:8080/api/v1/health` → `{"status":"ok"}` through the nginx proxy.

---

## Phase 3: User Story 1 - Write and keep notes in a category (Priority: P1) 🎯 MVP

**Goal**: Create categories, add notes to a category canvas, edit them; notes auto-save on blur
and survive reloads and save failures.

**Independent Test**: Create one category, add a note, type text, move focus away, reload,
confirm the note is still there (quickstart scenarios 1–3, 5).

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T032 [P] [US1] Contract tests `backend/tests/contract/test_categories_contract.py`: `POST /categories` → 201 matching `Category` with `note_count: 0`; `GET /categories` in creation order; name trimmed; 422 for `""`, `"   "`, and 51 characters; 409 `code: "category_name_conflict"` for `"Work"` then `"work"`
- [X] T033 [P] [US1] Contract tests `backend/tests/contract/test_notes_contract.py`: `POST /categories/{id}/notes` → 201, `content` default `""`, `position` = previous count; `GET` returns notes ordered by `position`; `PATCH /notes/{id}` → 200 with new `content` and later `updated_at`; 404 for unknown/malformed category or note IDs; 422 when content > 20 000 characters; 422 when PATCH body contains `category_id` (extra forbidden)
- [X] T034 [P] [US1] Unit tests `backend/tests/unit/test_category_service.py` and `backend/tests/unit/test_note_service.py` using in-memory fake repositories (name_key casefolding, conflict propagation, append position, 404 on missing category, `category_id` never changes on update)
- [X] T035 [P] [US1] Unit tests `frontend/tests/unit/state/notesStore.test.ts`: reducer transitions `saved → dirty → saving → saved`, `saving → error`, `error → dirty`, `error → saving` (retry); a draft restored on load becomes `dirty`
- [X] T036 [P] [US1] Unit tests `frontend/tests/unit/state/drafts.test.ts`: set/get/remove/all for `mynote.drafts`, corrupted JSON → empty
- [X] T037 [P] [US1] Component tests `frontend/tests/unit/components/NoteCard.test.tsx`: blur with no change → no PATCH; edit + blur → PATCH and indicator `Saving…` → `Saved`; server 500 → `Save failed – Retry`, content kept on screen and in `mynote.drafts`; Retry → `Saved` and draft removed
- [X] T038 [P] [US1] Component tests `frontend/tests/unit/components/CategoryForm.test.tsx` and `frontend/tests/unit/components/NoteCanvas.test.tsx`: empty/whitespace/51-char names rejected client-side; 409 shows "A category with this name already exists"; "Add note" appends a card at the end and focuses its textarea

### Backend implementation for User Story 1

- [X] T039 [P] [US1] Implement `backend/src/mynote/schemas/category.py`: `CategoryCreate` (`name`: "Trimmed; length 1–50" — strip, then validate 1–50 characters; `extra="forbid"`), `CategoryOut` (`id`, `name`, `created_at`, `note_count`)
- [X] T040 [P] [US1] Implement `backend/src/mynote/schemas/note.py`: `NoteCreate` (`content: str = ""`, "max 20 000 characters", `extra="forbid"`), `NoteUpdate` (`content` required, max 20 000, `extra="forbid"`), `NoteOut` (`id`, `category_id`, `content`, `position`, `created_at`, `updated_at`)
- [X] T041 [P] [US1] Implement `backend/src/mynote/repositories/categories.py`: `insert(name)` storing `name`, `name_key = name.casefold()`, `created_at = utcnow()` and translating `DuplicateKeyError` → `ConflictError("category_name_conflict")`; `list_all()` sorted by `created_at` with `note_count` (aggregation `$lookup`/count); `get(id)`
- [X] T042 [P] [US1] Implement `backend/src/mynote/repositories/notes.py`: `insert(category_id, content, position)` setting `created_at`/`updated_at`; `list_by_category(category_id)` sorted by `position`; `get(id)`; `update_content(id, content)` setting `updated_at`; `count_by_category(category_id)`
- [X] T043 [US1] Implement `backend/src/mynote/services/category_service.py`: `create_category`, `list_categories`; log `category.created` with `category_id` (depends on T039, T041)
- [X] T044 [US1] Implement `backend/src/mynote/services/note_service.py`: `create_note` (404 if the category is missing; "New note appended at end": `position = count(notes in category)`), `list_notes` (404 if the category is missing), `update_note` (content only; `category_id` is immutable); log `note.created` / `note.updated` with IDs and `content_length` only, never the note content (depends on T040, T042)
- [X] T045 [US1] Implement routers `backend/src/mynote/api/categories.py` (`GET`, `POST /categories`) and `backend/src/mynote/api/notes.py` (`GET`, `POST /categories/{categoryId}/notes`, `PATCH /notes/{noteId}`) per `contracts/openapi.yaml`; register them in `backend/src/mynote/main.py`

🔶 **Checkpoint (US1 backend)**: T032–T034 pass; endpoints visible at `/docs`.

### Frontend implementation for User Story 1

- [X] T046 [P] [US1] Implement `frontend/src/api/categories.ts` (`listCategories`, `createCategory`) and `frontend/src/api/notes.ts` (`listNotes`, `createNote`, `updateNote`)
- [X] T047 [P] [US1] Implement `frontend/src/state/drafts.ts`: `localStorage` key `mynote.drafts` = `{ [noteId]: { content, updatedAt } }` with `getDraft`, `setDraft`, `removeDraft`, `allDrafts`; tolerate corrupted data
- [X] T048 [US1] Implement `frontend/src/state/notesStore.tsx`: React context + `useReducer`; state = `categories`, `activeCategoryId`, `notes` keyed by id with `serverContent`, `content`, `saveState` (`saved` | `dirty` | `saving` | `error`), `order`; actions `loadCategories`, `addCategory`, `selectCategory`, `loadNotes` (merges drafts → `dirty`), `addNote`, `editNote` (writes draft), `saveNote` (PATCH; success clears draft → `saved`; failure → `error`, draft kept); follow the state diagram in data-model.md
- [X] T049 [P] [US1] Implement `frontend/src/components/SaveIndicator.tsx`: labels `Saved`, `Unsaved`, `Saving…`, `Save failed – Retry` (Retry is a 44 px button), `aria-live="polite"`
- [X] T050 [US1] Implement `frontend/src/hooks/useAutoSave.ts`: returns `onChange` (→ `editNote`) and `onBlur` (→ `saveNote` only when the note is `dirty` or `error`)
- [X] T051 [US1] Implement `frontend/src/components/NoteCard.tsx`: auto-growing `<textarea>` (labelled, max 20 000 characters), uses `useAutoSave`, shows `SaveIndicator`, focus when newly created; token colours only
- [X] T052 [US1] Implement `frontend/src/components/NoteCanvas.tsx`: header with category name + "Add note" button; responsive grid of `NoteCard`s in `position` order (`grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3` → `2xl:grid-cols-4` → 5–6 columns on ≥ 2200 px)
- [X] T053 [P] [US1] Implement `frontend/src/components/CategoryForm.tsx`: name input; client-side check "1–50 characters after trimming"; on 409 show "A category with this name already exists"; submit and cancel buttons
- [X] T054 [P] [US1] Implement `frontend/src/components/EmptyState.tsx`: message that a category is needed + "Create your first category" action
- [X] T055 [US1] Implement `frontend/src/components/CategoryTabs.tsx`: vertical, scrollable list of tabs in creation order (`created_at`); long names truncated with the full name in `title`; click/tap → `selectCategory`; "Add category" button opens `CategoryForm`
- [X] T056 [US1] Wire `frontend/src/App.tsx`: wrap in the notes store provider, load categories on start, show `EmptyState` when none exist, else `CategoryTabs` in the sidebar and `NoteCanvas` in main; select a newly created category

**Checkpoint (US1 / MVP)**: All US1 tests pass. In the compose stack, quickstart scenarios 1, 2, 3 and 5 (save failure + draft retention) pass. **STOP and validate — deployable MVP.**

---

## Phase 4: User Story 2 - Navigate between categories safely (Priority: P1)

**Goal**: Tab switching shows only that category's notes; unsaved changes are flushed before
switching, with a Retry / Discard / Cancel dialog on failure; last category is reopened; the
browser warns before leaving with unsaved changes.

**Independent Test**: Two categories with different notes; edit a note and immediately click
another tab → change preserved; reload reopens the last category (quickstart 4–6).

### Tests for User Story 2 ⚠️

- [X] T057 [P] [US2] Unit tests `frontend/tests/unit/hooks/useUnsavedGuard.test.tsx`: switching with no dirty notes switches immediately; dirty notes are saved first, then the switch happens; save failure → dialog open and the active category unchanged; Retry success → switch; "Discard changes & switch" → `serverContent` restored, drafts removed, switch; Cancel → stay, content kept
- [X] T058 [P] [US2] Unit tests `frontend/tests/unit/hooks/useBeforeUnload.test.ts`: handler is registered only while any note is `dirty`, `saving` or `error`
- [X] T059 [P] [US2] E2E `frontend/tests/e2e/navigation.spec.ts`: each canvas shows only its notes; the active tab has `aria-current="page"`; edit + immediate tab click → change persisted after reload; reload reopens the last active category; a deleted/missing last category → first category

### Implementation for User Story 2

- [X] T060 [US2] Extend `frontend/src/state/notesStore.tsx` with `flushAll()` (save every non-`saved` note of the active category concurrently; resolve `{ ok, failedIds }`) and `discardChanges(ids)` (restore `serverContent`, remove drafts, → `saved`)
- [X] T061 [P] [US2] Implement `frontend/src/components/UnsavedChangesDialog.tsx`: `Modal` with `role="alertdialog"`, explains which notes failed to save, buttons **Retry**, **Discard changes & switch** (danger), **Cancel** (initial focus)
- [X] T062 [US2] Implement `frontend/src/hooks/useUnsavedGuard.ts`: `requestSwitch(categoryId)` → `flushAll()` → switch on success, otherwise open `UnsavedChangesDialog` and handle Retry / Discard / Cancel (FR-011, FR-012)
- [X] T063 [US2] Update `frontend/src/components/CategoryTabs.tsx` to use `requestSwitch`; mark the active tab with `aria-current="page"` and active token styles; close the mobile drawer after selection
- [X] T064 [P] [US2] Implement `frontend/src/hooks/useBeforeUnload.ts` (FR-014) and use it in `frontend/src/App.tsx`
- [X] T065 [US2] Persist `mynote.lastCategoryId` in `localStorage` on every switch; on start open it if it still exists, else the first category (FR-004), in `frontend/src/state/notesStore.tsx` / `frontend/src/App.tsx`

**Checkpoint (US2)**: US1 + US2 tests pass; quickstart scenarios 4, 5 (tab-switch part) and 6 pass.

---

## Phase 5: User Story 3 - Delete notes and categories with confirmation (Priority: P2)

**Goal**: Delete notes and categories after confirmation; removing a non-empty category shows an
extra warning with the note count and deletes its notes.

**Independent Test**: Delete a note (cancel + confirm), remove an empty category and a category
with 3 notes; check dialogs, warning and final state (quickstart 7–8).

### Tests for User Story 3 ⚠️

- [X] T066 [P] [US3] Contract tests `backend/tests/contract/test_delete_contract.py`: `DELETE /notes/{id}` → 204, following notes' positions compacted to 0..n-1; `DELETE /categories/{id}` → 204, its notes gone, other categories' notes untouched; 404 for unknown IDs; `GET /categories` `note_count` reflects deletions
- [X] T067 [P] [US3] Unit tests `backend/tests/unit/test_delete_services.py`: cascade deletes notes before the category (verify call order with fakes); `category.deleted` log includes `notes_deleted`
- [X] T068 [P] [US3] Component tests `frontend/tests/unit/components/ConfirmDialog.test.tsx` and `frontend/tests/unit/flows/delete.test.tsx`: Cancel/Escape → no request; Confirm → removed; non-empty category shows a `role="alert"` warning with the count, empty category does not; failed delete keeps the item and shows an error; removing the active category opens another one, or the empty state if none remain

### Backend implementation for User Story 3

- [X] T069 [US3] Extend `backend/src/mynote/repositories/notes.py` with `delete(id)` + compact positions (`$inc: {position: -1}` for notes in the same category with a higher position) and `delete_by_category(category_id)` returning the deleted count; extend `backend/src/mynote/repositories/categories.py` with `delete(id)`
- [X] T070 [US3] Add `delete_note` to `backend/src/mynote/services/note_service.py` (404 if missing; log `note.deleted`) and `delete_category` to `backend/src/mynote/services/category_service.py` (404 if missing; delete notes first, then the category — research R6; log `category.deleted` with `notes_deleted`)
- [X] T071 [US3] Add `DELETE /notes/{noteId}` to `backend/src/mynote/api/notes.py` and `DELETE /categories/{categoryId}` to `backend/src/mynote/api/categories.py` (204 No Content)

🔶 **Checkpoint (US3 backend)**: T066–T067 pass.

### Frontend implementation for User Story 3

- [X] T072 [P] [US3] Add `deleteNote` to `frontend/src/api/notes.ts` and `deleteCategory` to `frontend/src/api/categories.ts`
- [X] T073 [P] [US3] Implement `frontend/src/components/ConfirmDialog.tsx`: `Modal` `role="alertdialog"`, title, message, optional warning block (`role="alert"`, danger token), confirm button (danger) + Cancel (initial focus), Escape = Cancel, buttons disabled while pending, error message on failure
- [X] T074 [US3] Add a delete button (44 px, `aria-label="Delete note"`) to `frontend/src/components/NoteCard.tsx` → `ConfirmDialog` "Delete this note?" → `deleteNote`; add a `removeNote` action to `frontend/src/state/notesStore.tsx` that also removes the draft and compacts local positions
- [X] T075 [US3] Add a "Remove category" button to the `frontend/src/components/NoteCanvas.tsx` header → `ConfirmDialog` "Remove category “{name}”?"; if the category has notes (count from loaded notes) add the warning "This category contains {n} note(s). They will be permanently deleted."; on success remove it from the store, select the next remaining category (or show `EmptyState`) and update `mynote.lastCategoryId`

**Checkpoint (US3)**: US1–US3 tests pass; quickstart scenarios 7 and 8 pass.

---

## Phase 6: User Story 4 - Reorder notes within a category (Priority: P2)

**Goal**: Reorder notes by drag and drop (mouse/touch/keyboard) or move up/down buttons; the order
persists; no cross-category moves.

**Independent Test**: With ≥ 3 notes, move the last note to first, reload, confirm the order
(quickstart 9–10).

### Tests for User Story 4 ⚠️

- [X] T076 [P] [US4] Contract tests `backend/tests/contract/test_reorder_contract.py`: `PUT /categories/{id}/notes/order` → 200 notes in the new order with positions 0..n-1; 422 `code: "invalid_note_order"` when an ID is missing, extra, duplicated, or belongs to another category; 404 for an unknown category
- [X] T077 [P] [US4] Unit tests `backend/tests/unit/test_reorder_service.py`: "Request list MUST equal the category's note-ID set exactly"
- [X] T078 [P] [US4] Component tests `frontend/tests/unit/flows/reorder.test.tsx`: Move up/Move down send the full new order; disabled at the first/last position and when there is a single note; a failed reorder reverts the order and shows an error
- [X] T079 [P] [US4] E2E `frontend/tests/e2e/reorder.spec.ts`: drag the last note to the first position (mouse; touch on tablet projects), reload → order kept; drop a note onto another category tab → note returns to its original position and the other category is unchanged

### Backend implementation for User Story 4

- [X] T080 [US4] Add `NoteOrder` (`note_ids`: list of unique ObjectId strings, `extra="forbid"`) to `backend/src/mynote/schemas/note.py` and `set_positions(category_id, ordered_ids)` to `backend/src/mynote/repositories/notes.py` using a single `bulk_write` of `UpdateOne({_id, category_id}, {$set: {position: i}})`
- [X] T081 [US4] Add `reorder_notes` to `backend/src/mynote/services/note_service.py`: 404 if the category is missing; the set of request IDs must equal the category's note-ID set, else `DomainValidationError("invalid_note_order")`; return notes in the new order; log `note.reordered` with `category_id` and `count`
- [X] T082 [US4] Add `PUT /categories/{categoryId}/notes/order` to `backend/src/mynote/api/notes.py`

🔶 **Checkpoint (US4 backend)**: T076–T077 pass.

### Frontend implementation for User Story 4

- [X] T083 [P] [US4] Add `reorderNotes(categoryId, noteIds)` to `frontend/src/api/notes.ts`
- [X] T084 [US4] Add a `reorder(fromIndex, toIndex)` action to `frontend/src/state/notesStore.tsx`: optimistic local reorder, call `reorderNotes`, revert and expose an error on failure
- [X] T085 [US4] Wrap the grid in `frontend/src/components/NoteCanvas.tsx` with dnd-kit `DndContext` + `SortableContext` (`rectSortingStrategy`), sensors `PointerSensor`, `TouchSensor` (delay 200 ms, tolerance 5 px), `KeyboardSensor` (`sortableKeyboardCoordinates`); `onDragEnd` without a target inside the canvas → no-op (tabs are not drop targets)
- [X] T086 [US4] In `frontend/src/components/NoteCard.tsx` use `useSortable`; add a drag-handle button (44 px, `aria-label="Reorder note"`, the only drag activator so text editing is unaffected) and **Move up** / **Move down** buttons (44 px) disabled at the boundaries

**Checkpoint (US4)**: US1–US4 tests pass; quickstart scenarios 9 and 10 pass.

---

## Phase 7: User Story 5 - Light and dark mode (Priority: P3)

**Goal**: User-switchable light/dark theme that persists and defaults to the OS preference.

**Independent Test**: Toggle the theme; every screen/dialog is legible; reload keeps it; with no
stored choice the OS preference is used (quickstart 11).

### Tests for User Story 5 ⚠️

- [X] T087 [P] [US5] Unit tests `frontend/tests/unit/hooks/useTheme.test.ts`: initial value from `mynote.theme`, else `matchMedia`; toggle flips the `dark` class on `<html>` and persists; OS changes are followed only while no choice is stored
- [X] T088 [P] [US5] E2E `frontend/tests/e2e/theme.spec.ts`: toggle switches tabs, canvas, notes and dialogs; reload keeps the choice; with an empty storage + `colorScheme: "dark"` the app starts dark

### Implementation for User Story 5

- [X] T089 [US5] Implement `frontend/src/hooks/useTheme.ts` per T087
- [X] T090 [US5] Implement `frontend/src/components/ThemeToggle.tsx` (44 px button, `aria-pressed`, accessible label "Dark mode") and place it in the sidebar in `frontend/src/App.tsx`
- [X] T091 [US5] Add `frontend/scripts/check-tokens.mjs`, which fails if any `frontend/src/**/*.tsx` file uses raw Tailwind palette colours (e.g. `bg-blue-500`, `text-gray-*`) or hex/rgb literals; run it from the `lint` script in `frontend/package.json`; fix any violations

**Checkpoint (US5)**: All story tests pass; quickstart scenario 11 passes; `npm run lint` passes.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Constitution quality gates, responsiveness/accessibility verification, docs

- [X] T092 [P] E2E `frontend/tests/e2e/responsive.spec.ts`: run the US1 add/edit, US3 delete and US4 reorder flows in all three Playwright projects × light/dark; assert no horizontal page overflow, sidebar/drawer usable, all interactive targets ≥ 44×44 px; run `@axe-core/playwright` with the `color-contrast` rule in both themes (SC-007, FR-024)
- [X] T093 [P] E2E `frontend/tests/e2e/performance.spec.ts`: seed a category with 200 notes through the API; switching to it renders all cards in < 1 s (SC-004)
- [X] T094 [P] Backend test `backend/tests/integration/test_logging_privacy.py`: capture logs during create/update/delete/reorder; assert every line is JSON with `request_id` and none contains note content
- [X] T095 Run `complexipy backend/src` and `npm run lint` (sonarjs cognitive complexity); for every function/component with cognitive complexity > 3, make sure a unit test exists (constitution testing constraint), and add missing tests under `backend/tests/unit/` / `frontend/tests/unit/`
- [X] T096 [P] Write root `README.md`: overview, architecture (3 containers), `.env` setup, `docker compose up --build`, local dev (uvicorn + `npm run dev`), running tests, logging format
- [X] T097 Container verification: `docker compose build` succeeds; `docker compose up -d` → all services healthy; `docker compose exec backend id -u` and `docker compose exec frontend id -u` are not 0; only port 8080 is published; adjust `backend/Dockerfile`, `frontend/Dockerfile` or `docker-compose.yml` only if verification fails
- [X] T098 Run the full `specs/001-category-notes-canvas/quickstart.md` validation (all 12 scenarios) against the compose stack and record the results in `specs/001-category-notes-canvas/checklists/validation.md`

**Final Checkpoint**: All backend, frontend unit and e2e suites green; quickstart 1–12 pass at the tablet and 27″ viewports in both themes; constitution Principles I–V verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational — provides the categories/notes base (create, list, edit)
- **US2 (Phase 4)**: depends on US1 (needs categories, notes store, auto-save)
- **US3 (Phase 5)**: depends on US1; independent of US2 (backend part can start right after Foundational)
- **US4 (Phase 6)**: depends on US1; independent of US2/US3 (backend part can start right after Foundational)
- **US5 (Phase 7)**: depends only on Foundational (tokens, shell); can run in parallel with US1–US4
- **Polish (Phase 8)**: depends on all stories

```text
Setup → Foundational ─┬─► US1 ─┬─► US2
                      │        ├─► US3
                      │        └─► US4
                      └─► US5
                                   all ─► Polish
```

### Within Each User Story

- Tests first (must fail) → schemas → repositories → services → routers → 🔶 backend checkpoint →
  frontend API → store → hooks → components → wiring → story checkpoint
- Tasks touching the same file run sequentially (e.g. `notesStore.tsx`, `NoteCard.tsx`,
  `NoteCanvas.tsx`, `services/note_service.py`)

### Parallel Opportunities

- Setup: T003–T008
- Foundational: T010–T012, T014–T015, T019–T020 (backend) in parallel with T021–T029 (frontend)
- Each story: all test tasks marked [P]; backend schemas/repositories [P]; frontend API module [P]
- Backend parts of US3 (T066–T071) and US4 (T076–T082) can be built in parallel with US1 frontend work
- US5 can be built by a separate developer at any time after Foundational

---

## Parallel Example: User Story 1

```bash
# Tests together:
Task: "Contract tests backend/tests/contract/test_categories_contract.py"
Task: "Contract tests backend/tests/contract/test_notes_contract.py"
Task: "Unit tests frontend/tests/unit/state/notesStore.test.ts"
Task: "Component tests frontend/tests/unit/components/NoteCard.test.tsx"

# Backend building blocks together:
Task: "schemas/category.py"   Task: "schemas/note.py"
Task: "repositories/categories.py"   Task: "repositories/notes.py"

# Frontend leaf components together:
Task: "SaveIndicator.tsx"   Task: "CategoryForm.tsx"   Task: "EmptyState.tsx"   Task: "api/*.ts"
```

## Parallel Example: User Story 3 + 4 backend

```bash
Task: "test_delete_contract.py"     Task: "test_reorder_contract.py"
# then sequentially per file: repositories/notes.py → services/note_service.py → api/notes.py
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → checkpoint
2. Phase 2 Foundational → checkpoint (3 containers healthy)
3. Phase 3 US1 → 🔶 backend checkpoint → US1 checkpoint
4. **STOP and VALIDATE** with quickstart 1–3, 5; demo in the compose stack

### Incremental Delivery

1. US1 → MVP (create/edit with auto-save)
2. US2 → safe navigation (completes the P1 scope and constitution Principle V)
3. US3 → deletions with confirmation
4. US4 → reordering
5. US5 → theme toggle (tokens already exist from Foundational, so the UI is theme-ready early)
6. Polish → full constitution quality gates

Each increment is validated at its checkpoint before the next one starts.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Never log note content; log IDs and lengths only
- Use only theme-token utilities for colours; never raw palette colours
- Commit after each task or logical group; stop at any checkpoint to validate
