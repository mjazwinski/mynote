import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockDb } from "../../mocks/db";
import { noteTextareas, renderApp, tab } from "../helpers";

const dialog = () => screen.getByRole("alertdialog");
const deleteCalls = () => mockDb.calls.filter((c) => c.startsWith("DELETE"));

describe("delete note", () => {
  async function setup() {
    const category = mockDb.seedCategory("Work");
    mockDb.seedNote(category.id, "keep");
    const doomed = mockDb.seedNote(category.id, "doomed");
    const app = await renderApp();
    return { ...app, doomed };
  }

  it("Cancel leaves the note unchanged and sends no request", async () => {
    const { user } = await setup();
    await user.click(screen.getAllByRole("button", { name: "Delete note" })[1]);
    expect(dialog()).toHaveAccessibleName("Delete this note?");
    await user.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(noteTextareas()).toHaveLength(2);
    expect(deleteCalls()).toEqual([]);
  });

  it("Confirm deletes the note permanently", async () => {
    const { user, doomed } = await setup();
    await user.click(screen.getAllByRole("button", { name: "Delete note" })[1]);
    await user.click(within(dialog()).getByRole("button", { name: "Delete note" }));
    await waitFor(() => expect(noteTextareas()).toHaveLength(1));
    expect(noteTextareas()[0]).toHaveValue("keep");
    expect(mockDb.notes.some((n) => n.id === doomed.id)).toBe(false);
  });

  it("a failed delete keeps the note and shows an error", async () => {
    const { user } = await setup();
    mockDb.failNext("deleteNote");
    await user.click(screen.getAllByRole("button", { name: "Delete note" })[1]);
    await user.click(within(dialog()).getByRole("button", { name: "Delete note" }));
    expect(await within(dialog()).findByText(/Deletion failed/)).toBeInTheDocument();
    expect(noteTextareas()).toHaveLength(2);
  });
});

describe("remove category", () => {
  it("empty category: confirmation without the extra warning", async () => {
    mockDb.seedCategory("Empty");
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Remove category" }));
    expect(dialog()).toHaveAccessibleName("Remove category “Empty”?");
    expect(within(dialog()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("non-empty category: shows a warning with the note count", async () => {
    const category = mockDb.seedCategory("Full");
    for (const t of ["a", "b", "c"]) mockDb.seedNote(category.id, t);
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Remove category" }));
    expect(within(dialog()).getByRole("alert")).toHaveTextContent(
      "This category contains 3 notes. They will be permanently deleted.",
    );
  });

  it("uses the singular for one note", async () => {
    const category = mockDb.seedCategory("One");
    mockDb.seedNote(category.id, "a");
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Remove category" }));
    expect(within(dialog()).getByRole("alert")).toHaveTextContent("contains 1 note.");
  });

  it("Cancel keeps the category", async () => {
    mockDb.seedCategory("Work");
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Remove category" }));
    await user.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(tab("Work")).toBeInTheDocument();
    expect(deleteCalls()).toEqual([]);
  });

  it("removing the active category opens another remaining one", async () => {
    const first = mockDb.seedCategory("First");
    mockDb.seedCategory("Second");
    mockDb.seedNote(first.id, "x");
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Remove category" }));
    await user.click(within(dialog()).getByRole("button", { name: "Remove category" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Second"),
    );
    expect(screen.queryByRole("button", { name: /^First/ })).not.toBeInTheDocument();
    expect(mockDb.notes).toHaveLength(0);
    expect(localStorage.getItem("mynote.lastCategoryId")).toBe(mockDb.categories[0].id);
  });

  it("removing the last category shows the empty state", async () => {
    mockDb.seedCategory("Only");
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Remove category" }));
    await user.click(within(dialog()).getByRole("button", { name: "Remove category" }));
    expect(await screen.findByRole("button", { name: "Create your first category" })).toBeInTheDocument();
    expect(localStorage.getItem("mynote.lastCategoryId")).toBeNull();
  });

  it("a failed removal keeps the category and shows an error", async () => {
    mockDb.seedCategory("Work");
    const { user } = await renderApp();
    mockDb.failNext("deleteCategory");
    await user.click(screen.getByRole("button", { name: "Remove category" }));
    await user.click(within(dialog()).getByRole("button", { name: "Remove category" }));
    expect(await within(dialog()).findByText(/Deletion failed/)).toBeInTheDocument();
    expect(tab("Work")).toBeInTheDocument();
  });
});
