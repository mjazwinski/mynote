<!--
Sync Impact Report
==================
Version change: (unversioned template) → 1.0.0
Bump rationale: Initial ratification; all placeholders replaced with project-specific governance.

Modified principles (template placeholder → new title):
  - [PRINCIPLE_1_NAME] → I. Prescribed Technology Stack
  - [PRINCIPLE_2_NAME] → II. Responsive Across Target Devices
  - [PRINCIPLE_3_NAME] → III. Light and Dark Themes
  - [PRINCIPLE_4_NAME] → IV. Category-per-Canvas Organization
  - [PRINCIPLE_5_NAME] → V. No Silent Data Loss (NON-NEGOTIABLE)

Added sections:
  - Technology & Architecture Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections: none

Templates requiring updates: none modified by this command (dependent templates read the
constitution at runtime).

Follow-up TODOs: none. Ratification date set to the date of first adoption (2026-11-18).
-->

# MyNote Constitution

## Core Principles

### I. Prescribed Technology Stack

- The frontend MUST be a web application built with ReactJS, HTML, and CSS.
- The backend MUST be implemented in Python.
- Persistent data MUST be stored in a NoSQL database (e.g., a document store). Relational
  databases MUST NOT be introduced as the primary data store.
- The frontend and backend MUST communicate exclusively through a documented HTTP API;
  the frontend MUST NOT access the database directly.

**Rationale**: A fixed, explicit stack keeps planning and implementation decisions consistent
and prevents scope drift into alternative frameworks or storage models.

### II. Responsive Across Target Devices

- Every screen MUST look correct and be fully usable on 10-inch tablets (both portrait and
  landscape orientation) and on desktop computers with 27-inch monitors, including all
  common viewport sizes in between.
- Layouts MUST use fluid/responsive CSS techniques (flexible units, media/container queries);
  fixed-pixel layouts that break or leave large unusable areas at either extreme are prohibited.
- All interactions MUST work with touch input (tablets) as well as mouse and keyboard
  (desktops). Interactive targets MUST be comfortably tappable on touch devices
  (minimum ~44×44 CSS px).
- Features MUST NOT depend on hover-only interactions.

**Rationale**: The application is used on both tablets and large monitors; a feature that only
works well on one of them is considered incomplete.

### III. Light and Dark Themes

- The application MUST provide both a light mode and a dark mode, switchable by the user.
- Colors MUST be defined through centralized theme tokens (e.g., CSS custom properties);
  hard-coded colors in components are prohibited.
- Every UI element MUST remain legible and visually consistent in both themes, with text
  contrast meeting WCAG 2.1 AA.
- The user's theme choice MUST persist across sessions.

**Rationale**: Theming is a first-class requirement; centralizing tokens ensures every new
feature supports both modes without extra effort.

### IV. Category-per-Canvas Organization

- Every note MUST belong to exactly one category.
- Each category MUST be represented by its own separate canvas; notes of one category are
  displayed and edited only on that category's canvas.
- The user MUST be able to switch between categories (canvases) from the main interface.

**Rationale**: Categories as distinct canvases are the core organizing model of the product;
all features must respect this structure.

### V. No Silent Data Loss (NON-NEGOTIABLE)

- **Auto-save**: When a note loses focus, its changes MUST be saved to the backend
  automatically, without requiring an explicit user action.
- **Unsaved-data check**: Before switching to another category (canvas), the application MUST
  check for unsaved changes and MUST either save them or ask the user how to proceed; it MUST
  NOT discard them silently.
- Save failures (e.g., network or server errors) MUST be surfaced to the user, and the unsaved
  content MUST be retained locally until it is saved or explicitly discarded by the user.
- The UI SHOULD indicate the save state of notes (e.g., saving, saved, unsaved, error).

**Rationale**: Users trust a note-taking application only if their writing is never lost;
these rules are the minimum guarantees of that trust.

## Technology & Architecture Constraints

- **Frontend**: ReactJS with HTML and CSS; theming via CSS custom properties. Additional
  libraries are allowed when justified in the implementation plan and compatible with
  Principles II and III.
- **Backend**: Python web service exposing a documented API (e.g., JSON over HTTP) for
  categories and notes.
- **Database**: NoSQL. The specific engine is chosen in the implementation plan and MUST be
  justified there.
- **Data model**: Notes and categories MUST be persisted server-side; client-side storage MAY
  be used only for caching, theme preference, and retaining unsaved edits (Principle V).
- **Supported environments**: Current versions of evergreen browsers (Chrome, Edge, Firefox,
  Safari) on tablets and desktops.
- **Testing**: Frontend and backend features must be unit tested, each feature with cognitive 
  complexity greater than 3 must have test

## Development Workflow & Quality Gates

- Every feature spec and implementation plan MUST include a Constitution Check confirming
  compliance with Principles I–V; any deviation MUST be documented and justified.
- Automated tests MUST cover backend API endpoints and persistence, and the frontend
  auto-save and unsaved-data-check behaviors.
- Before a feature is considered done it MUST be verified:
  - at a 10-inch tablet viewport (portrait and landscape) and at a 27-inch desktop viewport;
  - in both light and dark modes;
  - for no data loss when a note loses focus and when switching categories.
- Code review MUST reject changes that hard-code colors, break responsive layouts, or bypass
  the save mechanisms.

## Governance

- This constitution supersedes all other development practices for the MyNote project. Where
  another document conflicts with it, the constitution prevails.
- **Amendments** MUST be made via the `/speckit-constitution` workflow, documented with a Sync
  Impact Report, and reviewed before adoption. Amendments that affect existing features MUST
  include a migration plan.
- **Versioning** follows semantic versioning:
  - MAJOR: backward-incompatible removal or redefinition of a principle or governance rule;
  - MINOR: a new principle or section, or materially expanded guidance;
  - PATCH: clarifications, wording, and non-semantic fixes.
- **Compliance review**: every spec, plan, task list, and code review MUST verify adherence to
  this constitution. Added complexity MUST be justified in the implementation plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
