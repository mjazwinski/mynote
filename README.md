# MyNote

A notes web application. Notes are grouped into **categories**; each category has its own
**canvas**, opened from a tab on the left. Notes are saved automatically when they lose focus,
and switching categories never silently loses unsaved changes. Light and dark mode included.
Works on 10″ tablets (touch, portrait and landscape) up to 27″ desktop monitors.

Feature docs: [`specs/001-category-notes-canvas/`](specs/001-category-notes-canvas/) ·
Project rules: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Features

- Add, edit, delete and reorder notes (drag and drop with mouse, touch or keyboard, or
  Move up / Move down buttons). Notes can only be reordered within their own category.
- Add and remove categories. Every delete asks for confirmation; removing a category that still
  has notes shows an extra warning with the number of notes that will be deleted.
- Auto-save on blur with a visible save state (Saved / Unsaved / Saving… / Save failed – Retry).
- Unsaved edits are kept in the browser (`localStorage`) until saved, and survive reloads.
- Category switch saves pending edits first; if saving fails you can Retry, Discard & switch, or
  Cancel. The browser warns before closing a tab with unsaved changes.
- Light/dark theme (remembered; defaults to the OS setting).

## Architecture

Three containers, wired with Docker Compose:

```text
browser ──► frontend (nginx :8080)
              ├── /         → React SPA (static files built by Vite)
              └── /api/*    → backend:8000  (FastAPI, async)
                                 └── mongo:27017 (MongoDB 8, volume mongo-data)
```

| Part | Stack | Location |
|------|-------|----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, dnd-kit, Vite; served by nginx (non-root) | [`frontend/`](frontend/) |
| Backend | Python ≥ 3.12, FastAPI, Pydantic v2, PyMongo async client, Uvicorn (non-root) | [`backend/`](backend/) |
| Database | MongoDB 8 (official image) | `docker-compose.yml` |

REST API (prefix `/api/v1`): see [`contracts/openapi.yaml`](specs/001-category-notes-canvas/contracts/openapi.yaml)
or the live docs at `http://localhost:8000/docs` when running the backend locally.

## Run with Docker

```bash
cp .env.example .env          # then set MONGO_ROOT_PASSWORD
docker compose up --build -d
docker compose ps             # mongo, backend, frontend → healthy
```

Open <http://localhost:8080>. Stop with `docker compose down` (`-v` also deletes the data volume).

Only the frontend port is published. The backend and MongoDB are reachable only inside the
Compose network (uncomment the `ports` entry of `backend` in `docker-compose.yml` to call the API
directly while developing).

### Configuration (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONGO_ROOT_USER` | `mynote` | MongoDB root user (also used by the backend) |
| `MONGO_ROOT_PASSWORD` | — (required) | MongoDB root password; avoid `@ : / ? # %` |
| `MONGODB_DB` | `mynote` | Database name |
| `LOG_LEVEL` | `INFO` | Backend log level |
| `FRONTEND_PORT` | `8080` | Host port of the web UI |

## Local development (without containers)

```bash
# MongoDB, e.g.
docker run -d --name mynote-dev-mongo -p 27017:27017 mongo:8

# Backend (http://localhost:8000)
cd backend
python -m venv .venv && .venv/Scripts/activate      # Windows; use .venv/bin/activate elsewhere
pip install -e ".[dev]"
uvicorn mynote.main:app --reload

# Frontend (http://localhost:5173, proxies /api to :8000)
cd frontend
npm ci
npm run dev
```

## Tests

```bash
# Backend: unit + contract + integration tests against a real MongoDB.
# Uses MONGODB_TEST_URI if set, otherwise starts a throwaway mongo:8 via testcontainers.
cd backend && pytest
ruff check src tests && complexipy src

# Frontend: unit/component tests (Vitest + Testing Library + MSW)
cd frontend && npm test
npm run lint                  # ESLint (incl. cognitive-complexity report) + theme-token check

# End-to-end (Playwright) against the running compose stack, at 800×1280, 1280×800 (touch)
# and 2560×1440, in light and dark mode, incl. axe colour-contrast checks
cd frontend && npx playwright install chromium && npm run e2e
```

## Logging

The backend writes **one JSON object per line** to stdout using the standard-library `logging`
module (`backend/src/mynote/logging_config.py`):

```json
{"timestamp": "2026-11-18T15:42:38.500+00:00", "level": "INFO", "logger": "mynote.access",
 "message": "request.completed", "request_id": "b62639a7…", "method": "GET",
 "path": "/api/v1/health", "status": 200, "duration_ms": 17.69}
```

- Every request gets an `X-Request-ID` (taken from the request or generated; nginx forwards
  its own) that appears on every log line of that request and in the response header.
- Domain events: `category.created`, `category.deleted` (`notes_deleted`), `note.created`,
  `note.updated` (`content_length`), `note.deleted`, `note.reordered`; rejected requests at
  WARNING, unhandled errors at ERROR with stack trace.
- **Note content is never logged** (IDs and lengths only). PyMongo's command logging is capped
  at WARNING even with `LOG_LEVEL=DEBUG`, because it would include document contents.

View logs with `docker compose logs -f backend`.
