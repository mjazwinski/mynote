# Feature Specification: Category Notes Canvas

**Feature Branch**: `001-category-notes-canvas`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Notes web app where notes are grouped into categories. Each category has its own canvas, opened by clicking a tab on the left side. Users can add, edit, delete and reorder notes, and add and remove categories. Every delete (note or category) must first ask the user for confirmation. Removing a category deletes all its notes; if the category still contains notes, the confirmation must show an extra warning that its notes will be deleted too. Reordering notes is only within a single category; notes cannot be moved between categories. A note is saved automatically when it loses focus. Switching categories checks for unsaved changes first. Light and dark mode."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write and keep notes in a category (Priority: P1)

A user opens the app, creates a category (e.g., "Work"), opens its canvas, adds a note and
types into it. When they click or tap outside the note, it is saved automatically. When they
come back later, the note is still there with the same content.

**Why this priority**: Creating, editing and reliably keeping notes is the core value of the
product. Without it nothing else matters.

**Independent Test**: Create one category, add a note, type text, move focus away, reload the
app and confirm the note and its content are still present on that category's canvas.

**Acceptance Scenarios**:

1. **Given** no categories exist, **When** the user opens the app, **Then** an empty state
   explains that a category must be created first and offers an action to create one.
2. **Given** the user enters a valid category name, **When** they confirm creation, **Then** a
   new tab with that name appears in the left-side tab list and its (empty) canvas is opened.
3. **Given** a category canvas is open, **When** the user chooses "add note", **Then** a new
   empty note appears on that canvas at the end of the note order and receives focus.
4. **Given** a note has been edited, **When** the note loses focus, **Then** its content is
   saved without any further user action and the note shows a "saved" state.
5. **Given** an existing note, **When** the user changes its content and it loses focus,
   **Then** the updated content is saved and shown after the app is reloaded.

---

### User Story 2 - Navigate between categories safely (Priority: P1)

A user with several categories switches between them by clicking/tapping tabs on the left
side. Each tab opens that category's own canvas showing only its notes. If there are unsaved
changes when switching, the app makes sure nothing is lost.

**Why this priority**: Category-per-canvas navigation is the organizing model of the app, and
data safety on switching is non-negotiable.

**Independent Test**: Create two categories with different notes, switch between tabs and
confirm each canvas shows only its own notes; edit a note and click another tab immediately,
confirming the change is preserved.

**Acceptance Scenarios**:

1. **Given** multiple categories exist, **When** the user clicks/taps a category tab, **Then**
   that category's canvas is shown with only its notes, and the tab is visibly marked as active.
2. **Given** a note has unsaved changes, **When** the user selects another category tab,
   **Then** the app saves the changes first and switches only after the save succeeds.
3. **Given** a note has unsaved changes and saving fails, **When** the user selects another
   category tab, **Then** the app stays on the current canvas and asks the user to choose
   between retrying the save, discarding the changes and switching, or cancelling the switch.
4. **Given** the user reloads the app, **When** it opens, **Then** the most recently active
   category is opened (or the first category if that one no longer exists).

---

### User Story 3 - Delete notes and categories with confirmation (Priority: P2)

A user removes a note or a whole category they no longer need. Every deletion asks for
confirmation first. Deleting a category that still contains notes shows an additional warning
that all its notes will be deleted too.

**Why this priority**: Deletion is needed to keep content tidy, but it is destructive, so it
must be guarded; it is secondary to creating and reading notes.

**Independent Test**: Delete a note (confirm and cancel paths), delete an empty category and a
non-empty category, verifying confirmation dialogs, the extra warning and the final state.

**Acceptance Scenarios**:

1. **Given** a note exists, **When** the user chooses to delete it, **Then** a confirmation
   dialog is shown; on confirm the note is removed permanently, on cancel nothing changes.
2. **Given** an empty category exists, **When** the user chooses to remove it, **Then** a
   confirmation dialog naming the category is shown; on confirm the category and its tab are
   removed, on cancel nothing changes.
3. **Given** a category contains notes, **When** the user chooses to remove it, **Then** the
   confirmation dialog additionally shows a prominent warning stating that all of its notes
   (with their count) will be permanently deleted as well.
4. **Given** the user confirms removal of the currently active category, **When** removal
   completes, **Then** another remaining category is opened, or the empty state is shown if
   none remain.

---

### User Story 4 - Reorder notes within a category (Priority: P2)

A user arranges the notes on a category canvas in the order they prefer. The order is kept
across sessions. Notes can only be reordered within their own category.

**Why this priority**: Ordering helps users organize their thoughts but the app is usable
without it.

**Independent Test**: In one category with at least three notes, move the last note to the
first position, reload the app and confirm the new order persists.

**Acceptance Scenarios**:

1. **Given** a canvas with several notes, **When** the user drags a note to a new position (with
   mouse or touch), **Then** the notes are shown in the new order and the order is saved.
2. **Given** a canvas with several notes, **When** the user uses the keyboard/button
   alternative to move a note up or down, **Then** the note moves one position and the order
   is saved.
3. **Given** a note is being dragged, **When** the user drops it over a different category
   tab, **Then** the note is not moved to that category and returns to its original position.
4. **Given** the order has been changed, **When** the app is reloaded, **Then** the notes are
   displayed in the changed order.

---

### User Story 5 - Light and dark mode (Priority: P3)

A user switches the app between light and dark appearance. Their choice is remembered.

**Why this priority**: Improves comfort but does not affect core note-taking.

**Independent Test**: Toggle the theme, verify every screen and dialog is legible in both
modes, reload and confirm the chosen mode is retained.

**Acceptance Scenarios**:

1. **Given** the app is in light mode, **When** the user toggles the theme, **Then** the entire
   interface (tabs, canvas, notes, dialogs) switches to dark mode immediately.
2. **Given** the user has chosen a theme, **When** they reload the app, **Then** the same
   theme is applied.
3. **Given** the user has never chosen a theme, **When** they open the app, **Then** it follows
   the device's light/dark preference.

---

### Edge Cases

- User tries to create a category with an empty name, only whitespace, a name longer than 50
  characters, or a name already used by another category (case-insensitive) → creation is
  rejected with a clear message.
- Many categories exist → the left tab list scrolls and remains usable; long category names are
  truncated with the full name available on the tab.
- A very long note → the note remains readable and editable (scrolls or grows) without breaking
  the canvas layout.
- The server is unreachable when a note loses focus → the note shows an error state, the edited
  content stays on screen and is kept locally, and the user can retry; it is never discarded
  silently.
- The user closes or reloads the browser tab while a note has unsaved changes → the browser
  asks for confirmation before leaving.
- The user deletes a note while it has unsaved edits → the delete confirmation applies; on
  confirm the note and its unsaved edits are discarded.
- A newly added note is left empty → it is kept as an empty note (the user can delete it).
- Deletion fails on the server → the item stays visible and the user is told the deletion
  failed.
- Reordering a category with a single note → reorder controls are disabled or have no effect.

## Requirements *(mandatory)*

### Functional Requirements

**Categories & navigation**

- **FR-001**: Users MUST be able to create a category by providing a name (1–50 characters after
  trimming, unique case-insensitively).
- **FR-002**: System MUST show every category as a clickable/tappable tab in a vertical list on
  the left side of the screen, in creation order.
- **FR-003**: Selecting a tab MUST open that category's own canvas, showing only the notes of that
  category, and MUST visibly mark the tab as active.
- **FR-004**: System MUST remember the last active category and reopen it on next launch.
- **FR-005**: When no categories exist, System MUST show an empty state with an action to create
  the first category.

**Notes**

- **FR-006**: Users MUST be able to add a new note to the currently open category; the new note
  is placed at the end of that category's order and receives focus.
- **FR-007**: Users MUST be able to edit the text content of any note directly on the canvas.
- **FR-008**: Each note MUST belong to exactly one category; notes MUST NOT be movable to another
  category.

**Saving & data safety**

- **FR-009**: System MUST save a note's changes automatically when the note loses focus.
- **FR-010**: System MUST display each note's save state (saving, saved, unsaved changes, save
  failed).
- **FR-011**: Before switching to another category, System MUST check for unsaved changes, save
  them, and switch only after a successful save.
- **FR-012**: If saving fails during a category switch, System MUST keep the user on the current
  canvas and offer: retry, discard changes and switch, or cancel.
- **FR-013**: If any save fails, System MUST inform the user and keep the unsaved content
  (including across a page reload) until it is saved or the user explicitly discards it.
- **FR-014**: System MUST warn the user before the browser tab is closed or reloaded while unsaved
  changes exist.

**Deletion**

- **FR-015**: Users MUST be able to delete a note; System MUST ask for confirmation before
  deleting, and cancelling MUST leave the note unchanged.
- **FR-016**: Users MUST be able to remove a category; System MUST ask for confirmation before
  removing, and cancelling MUST leave the category unchanged.
- **FR-017**: When the category to remove contains notes, the confirmation MUST include an
  additional, visually prominent warning stating that its notes (with their count) will be
  permanently deleted too.
- **FR-018**: Confirmed removal of a category MUST permanently delete the category and all of
  its notes.
- **FR-019**: After removing the active category, System MUST open another remaining category,
  or the empty state if none remain.

**Reordering**

- **FR-020**: Users MUST be able to reorder notes within a category by drag and drop, working
  with both mouse and touch input.
- **FR-021**: System MUST provide a non-drag alternative to reorder notes (e.g., move up / move
  down controls) usable via keyboard and touch.
- **FR-022**: The note order of each category MUST be persisted and restored on next launch.

**Appearance & devices**

- **FR-023**: Users MUST be able to switch between light and dark mode; the choice MUST persist
  across sessions, and without a stored choice the device preference MUST be used.
- **FR-024**: All screens and dialogs MUST be fully usable on 10-inch tablets (portrait and
  landscape, touch input) and on 27-inch desktop monitors (mouse and keyboard), with no feature
  depending on hover alone.

### Key Entities *(include if feature involves data)*

- **Category**: A named group of notes represented by its own tab and canvas. Attributes: name
  (unique), creation time, position in the tab list. Contains zero or more notes.
- **Note**: A piece of user-written text belonging to exactly one category. Attributes: text
  content, position within its category, creation time, last-updated time.
- **User preferences**: Device-local settings: chosen theme and last active category.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can create a category and write their first note in under
  1 minute without instructions.
- **SC-002**: 100% of note edits are retained after the note loses focus and the app is reloaded,
  in normal network conditions.
- **SC-003**: In tests that simulate save failures, 0 edits are lost silently: every failure is
  shown to the user and the content remains recoverable.
- **SC-004**: Switching between categories shows the selected canvas in under 1 second for
  categories with up to 200 notes.
- **SC-005**: 100% of delete actions (notes and categories) require explicit confirmation, and
  every removal of a non-empty category shows the additional warning.
- **SC-006**: A reordered note order is identical after reload in 100% of test runs.
- **SC-007**: All user stories can be completed on a 10-inch tablet (both orientations) and on a
  27-inch monitor, in both light and dark mode, without layout breakage or unreadable text.

## Assumptions

- Single-user application: no sign-in, accounts or sharing in this version.
- A note consists of plain text content (no title field, rich text, images or attachments).
- Notes on a canvas are laid out automatically in their user-defined order (e.g., a responsive
  grid of note cards); free-form positioning anywhere on the canvas is out of scope.
- Renaming and reordering categories are out of scope for this version; tabs are listed in
  creation order.
- Deletion is permanent; there is no trash/undo in this version.
- The user is normally online; offline editing beyond retaining unsaved edits locally is out of
  scope.
- Search, tagging and export are out of scope.
