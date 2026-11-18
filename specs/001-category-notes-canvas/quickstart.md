# Quickstart & Validation: Category Notes Canvas

How to run the application and prove the feature works end-to-end. API details:
[contracts/openapi.yaml](./contracts/openapi.yaml); UI behaviour:
[contracts/ui-contract.md](./contracts/ui-contract.md); data rules: [data-model.md](./data-model.md).

## Prerequisites

- Docker Engine 24+ with Docker Compose v2
- For local development without containers: Python 3.12+, Node 22+, a reachable MongoDB 8

## Run with containers

```bash
cp .env.example .env            # adjust credentials/ports if needed
docker compose up --build -d
docker compose ps               # mongo, backend, frontend → healthy / running
```

Open http://localhost:8080.

Checks:

```bash
curl -s http://localhost:8080/api/v1/health          # {"status":"ok"} (via nginx proxy)
docker compose logs backend | head                   # one JSON object per line
```

Stop: `docker compose down` (add `-v` to also delete the Mongo volume).

## Run tests

```bash
# backend (needs Docker for testcontainers, or set MONGODB_URI to a running Mongo)
cd backend && pip install -e ".[dev]" && pytest

# frontend unit/component
cd frontend && npm ci && npm test

# e2e against the running compose stack
cd frontend && npx playwright test
```

Expected: all suites pass.

## Manual validation scenarios

| # | Scenario | Expected result | Spec |
|---|----------|-----------------|------|
| 1 | Fresh start (empty DB) | Empty state with "Create your first category" | FR-005 |
| 2 | Create category "Work"; then "work" | First appears as left tab and opens; second rejected as duplicate | FR-001–FR-003 |
| 3 | Add note, type text, click outside, reload | Indicator goes Saving… → Saved; text present after reload | FR-006, FR-009–FR-010 |
| 4 | Edit a note, immediately click another tab | Change saved first, then canvas switches; each canvas shows only its notes | FR-011 |
| 5 | `docker compose stop backend`, edit note, blur, click another tab | "Save failed" shown; dialog Retry / Discard & switch / Cancel; reload keeps draft; restart backend + Retry → Saved | FR-012–FR-013 |
| 6 | Edit a note and close the browser tab | Browser leave-confirmation appears | FR-014 |
| 7 | Delete a note → Cancel, then → Confirm | Cancel: unchanged; Confirm: note removed, persists after reload | FR-015 |
| 8 | Remove empty category; remove category with 3 notes | Confirmation each time; second shows warning "contains 3 notes…"; after confirm another tab opens or empty state | FR-016–FR-019 |
| 9 | Drag last note to first position (mouse, then touch); use move-up button; reload | New order shown and kept after reload | FR-020–FR-022 |
| 10 | Drag a note onto another category tab | Note returns to original position; other category unchanged | FR-008 |
| 11 | Toggle theme; reload; clear storage with OS in dark mode | Whole UI switches; choice kept; default follows OS | FR-023 |
| 12 | Repeat 3, 8, 9 at 800×1280, 1280×800 and 2560×1440, in both themes | No layout breakage, readable text, all controls usable by touch/mouse | FR-024, SC-007 |
