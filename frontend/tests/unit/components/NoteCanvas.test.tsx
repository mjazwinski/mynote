import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dropMove } from "../../../src/components/NoteCanvas";
import { mockDb } from "../../mocks/db";
import { noteTextareas, renderApp } from "../helpers";

describe("NoteCanvas", () => {
  it("shows notes of the active category in position order", async () => {
    const category = mockDb.seedCategory("Work");
    mockDb.seedNote(category.id, "first");
    mockDb.seedNote(category.id, "second");
    await renderApp();
    expect(noteTextareas().map((t) => (t as HTMLTextAreaElement).value)).toEqual(["first", "second"]);
  });

  it("Add note appends a card at the end and focuses it", async () => {
    const category = mockDb.seedCategory("Work");
    mockDb.seedNote(category.id, "existing");
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(noteTextareas()).toHaveLength(2));
    const last = noteTextareas()[1];
    expect(last).toHaveValue("");
    await waitFor(() => expect(last).toHaveFocus());
    expect(mockDb.notes.at(-1)?.position).toBe(1);
  });

  it("shows a hint when the category has no notes", async () => {
    mockDb.seedCategory("Empty");
    await renderApp();
    expect(screen.getByText(/No notes yet/)).toBeInTheDocument();
  });

  it("shows an error banner when adding a note fails", async () => {
    mockDb.seedCategory("Work");
    const { user } = await renderApp();
    mockDb.failNext("createNote");
    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(await screen.findByText(/Could not add the note/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/Could not add the note/)).not.toBeInTheDocument();
  });
});

describe("dropMove", () => {
  const order = ["a", "b", "c"];
  it("returns indices for a move within the canvas", () => {
    expect(dropMove(order, "c", "a")).toEqual({ from: 2, to: 0 });
  });
  it("ignores drops outside the canvas (e.g. on a category tab)", () => {
    expect(dropMove(order, "a", null)).toBeNull();
  });
  it("ignores drops on itself or unknown targets", () => {
    expect(dropMove(order, "a", "a")).toBeNull();
    expect(dropMove(order, "a", "zzz")).toBeNull();
  });
});
