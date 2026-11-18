# Implementation Plan: Category Notes Canvas

**Branch**: `001-category-notes-canvas` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-category-notes-canvas/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A single-user notes web application: categories are listed as tabs on the left; each tab opens
a canvas containing that category's notes as an ordered, responsive grid of cards. Users add,
edit, delete and reorder notes (within the category only) and add/remove categories; every
delete is confirmed, and removing a non-empty category shows an extra warning. Notes auto-save
on blur, category switches flush unsaved changes first, and the UI supports light/dark mode.

Technical approach: React + TypeScript + Tailwind SPA served by nginx (frontend container),
talking to an async FastAPI REST API (backend container) that persists to MongoDB (separate
`mongo` container) through PyMongo's async client, with JSON structured logging via Python
`logging`. The three containers are wired with Docker Compose.

## Technical Context

**Language/Version**: Python ≥ 3.12 (backend); TypeScript 5.x / ES2022 (frontend), Node 22 for build only

**Primary Dependencies**: Backend — FastAPI, Uvicorn, Pydantic v2, pydantic-settings, PyMongo ≥ 4.13
(`AsyncMongoClient`). Frontend — React 19, Vite, Tailwind CSS v4, @dnd-kit/core + @dnd-kit/sortable

**Storage**: MongoDB 8 (official `mongo:8` image, separate container, named volume)

**Testing**: Backend — pytest, pytest-asyncio, httpx (ASGI), testcontainers[mongodb]. Frontend —
Vitest, React Testing Library, MSW; Playwright for e2e (tablet + 27″ viewports, both themes)

**Target Platform**: Linux containers (Docker / Docker Compose); browsers: current Chrome, Edge,
Firefox, Safari on 10″ tablets and desktop up to 27″ monitors

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Canvas switch < 1 s for categories with up to 200 notes (SC-004); single
note save round-trip < 300 ms on LAN

**Constraints**: Zero silent data loss (Principle V); fully async backend I/O (no blocking calls on
the event loop); all logs as one-line JSON on stdout; containers run as non-root

**Scale/Scope**: Single user; ~tens of categories, ≤ 200 notes per category; ~8 UI components,
9 REST operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Rule | How the plan complies | Status |
|------------------|-----------------------|--------|
| I. Prescribed stack — React/HTML/CSS frontend | React + Tailwind (CSS) SPA, HTML entry `index.html` | ✅ |
| I. Python backend | FastAPI on Python 3.12 | ✅ |
| I. NoSQL storage | MongoDB | ✅ |
| I. Frontend ↔ backend only via documented HTTP API | REST `/api/v1`, [contracts/openapi.yaml](./contracts/openapi.yaml); frontend container has no DB access | ✅ |
| II. Responsive 10″ tablet ↔ 27″ monitor, touch + mouse/keyboard, no hover-only | Fluid grid, collapsible sidebar < 1024 px, 44 px targets, dnd-kit touch/keyboard sensors + move buttons ([ui-contract](./contracts/ui-contract.md)) | ✅ |
| III. Light/dark, centralized tokens, WCAG AA, persisted choice | CSS custom-property tokens mapped into Tailwind `@theme`; `dark` class; `localStorage` (research R8–R9) | ✅ |
| IV. Category-per-canvas, note in exactly one category | `category_id` required and immutable; canvas per tab; reorder restricted to category | ✅ |
| V. Auto-save on blur, unsaved check on switch, surfaced failures, local retention, save-state UI | Save-state machine, local drafts, flush-before-switch dialog, `beforeunload` (research R11, data-model) | ✅ |
| Constraint: NoSQL engine justified in plan | MongoDB requested by user; document model fits categories/notes (research R2) | ✅ |
| Constraint: unit tests; cognitive complexity > 3 ⇒ unit test | Test strategy R13; complexity linters as reporting aid | ✅ |
| Quality gates: API + persistence tests, auto-save/unsaved-guard tests, viewport + theme verification | pytest API/integration suite; Vitest component tests; Playwright matrix (3 viewports × 2 themes) | ✅ |

**Result**: PASS — no violations, Complexity Tracking not required.

**Post-design re-check (after Phase 1)**: PASS — data model, contracts and container design
introduce no new deviations. Note: the nginx reverse proxy in the frontend container only
forwards `/api/` to the backend; it does not access the database, so Principle I holds.

## Project Structure

### Documentation (this feature)

```text
specs/001-category-notes-canvas/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── openapi.yaml     # REST contract
│   └── ui-contract.md   # Observable UI behaviour
└── tasks.md             # Phase 2 output (/speckit-tasks – not created here)
```

### Source Code (repository root)

```text
docker-compose.yml               # frontend + backend + mongo services
.env.example                     # Compose variables (ports, Mongo credentials, log level)

backend/
├── Dockerfile                   # multi-stage, python:3.12-slim, non-root, uvicorn
├── .dockerignore
├── pyproject.toml               # deps, ruff, pytest config
├── src/mynote/
│   ├── main.py                  # app factory, lifespan (Mongo client, indexes), routers
│   ├── config.py                # pydantic-settings: MONGODB_URI, MONGODB_DB, LOG_LEVEL, CORS_ORIGINS
│   ├── logging_config.py        # dictConfig, JsonFormatter, RequestIdFilter
│   ├── middleware.py            # request-ID + access logging middleware
│   ├── db.py                    # AsyncMongoClient lifecycle, index creation
│   ├── errors.py                # domain exceptions → HTTP error mapping
│   ├── schemas/                 # Pydantic request/response models (category.py, note.py)
│   ├── repositories/            # categories.py, notes.py (all Mongo access)
│   ├── services/                # category_service.py, note_service.py (rules, cascade, reorder)
│   └── api/                     # health.py, categories.py, notes.py (routers)
└── tests/
    ├── unit/                    # services, formatter, schema validation
    ├── integration/             # repositories against real Mongo (testcontainers)
    └── contract/                # API responses vs. openapi.yaml

frontend/
├── Dockerfile                   # multi-stage: node:22-alpine build → nginx-unprivileged:1.27-alpine runtime
├── .dockerignore
├── nginx/default.conf.template  # SPA fallback, /api proxy to ${BACKEND_URL}
├── index.html                   # pre-paint theme script
├── package.json / vite.config.ts / tsconfig.json
├── src/
│   ├── main.tsx / App.tsx
│   ├── api/                     # client.ts (typed fetch), categories.ts, notes.ts
│   ├── state/                   # notesStore (context + reducer), drafts.ts (localStorage)
│   ├── hooks/                   # useAutoSave, useUnsavedGuard, useTheme, useBeforeUnload
│   ├── components/              # CategoryTabs, CategoryForm, NoteCanvas, NoteCard,
│   │                            # SaveIndicator, ConfirmDialog, UnsavedChangesDialog,
│   │                            # ThemeToggle, EmptyState
│   └── styles/                  # theme.css (tokens), index.css (Tailwind entry)
└── tests/
    ├── unit/                    # Vitest + RTL + MSW
    └── e2e/                     # Playwright (viewport × theme matrix)
```

**Structure Decision**: Web application layout with independent `backend/` and `frontend/`
projects, each with its own Dockerfile and producing its own container image. MongoDB is not
built by the project; it runs from the official image as the third Compose service.

### Container topology

```text
browser ──► frontend (nginx :8080)
              ├── /         → static SPA (built by Vite)
              └── /api/*    → backend:8000  (BACKEND_URL)
                                 └── mongo:27017 (MONGODB_URI, volume mongo-data)
```

- Only `frontend` port is published by default; `backend` and `mongo` are on the internal
  Compose network (backend port can be published for local debugging).
- Startup order: `mongo` healthy → `backend` healthy (`/api/v1/health`) → `frontend`.
- Configuration via environment variables only; secrets (Mongo root credentials) come from
  `.env` (not committed; `.env.example` provided).

## Key Design Decisions

See [research.md](./research.md) for full rationale. Highlights:

- **Async throughout**: FastAPI async handlers, `AsyncMongoClient`, no blocking I/O (R2–R3).
- **Structured logging**: stdlib `logging` + custom `JsonFormatter`, request-ID via
  `contextvars`, uvicorn loggers unified, `LOG_LEVEL` env (R4). Log events: request start/end
  (method, path, status, duration_ms), category/note create/update/delete/reorder (ids, counts),
  validation/conflict warnings, Mongo connection errors. Note content is never logged.
- **Ordering**: integer `position`; full-list reorder endpoint validated against the category's
  note set (R5).
- **Cascade delete** without transactions, notes first then category (R6).
- **Case-insensitive unique names** via `name_key` unique index (R7).
- **Data safety on the client**: save-state machine, localStorage drafts, flush-before-switch,
  `beforeunload` (R11).

## Complexity Tracking

No constitution violations; section intentionally empty.
