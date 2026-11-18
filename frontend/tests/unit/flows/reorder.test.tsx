import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockDb } from "../../mocks/db";
import { noteTextareas, renderApp } from "../helpers";

const values = () => noteTextareas().map((t) => (t as HTMLTextAreaElement).value);
const card = (index: number) => screen.getAllByTestId("note-card")[index];

async function setup(contents = ["a", "b", "c"]) {
  const category = mockDb.seedCategory("Work");
  const notes = contents.map((c) => mockDb.seedNote(category.id, c));
  const app = await renderApp();
  return { ...app, category, notes };
}

describe("reorder with Move up / Move down", () => {
  it("Move up sends the full new order and updates the canvas", async () => {
    const { user, category, notes } = await setup();
    await user.click(within(card(2)).getByRole("button", { name: "Move up" }));
    await waitFor(() => expect(values()).toEqual(["a", "c", "b"]));
    expect(mockDb.calls).toContain(`PUT /categories/${category.id}/notes/order`);
    expect(mockDb.listNotes(category.id).map((n) => n.id)).toEqual([notes[0].id, notes[2].id, notes[1].id]);
  });

  it("Move down moves one position", async () => {
    const { user } = await setup();
    await user.click(within(card(0)).getByRole("button", { name: "Move down" }));
    await waitFor(() => expect(values()).toEqual(["b", "a", "c"]));
  });

  it("disables Move up on the first and Move down on the last note", async () => {
    await setup();
    expect(within(card(0)).getByRole("button", { name: "Move up" })).toBeDisabled();
    expect(within(card(0)).getByRole("button", { name: "Move down" })).toBeEnabled();
    expect(within(card(2)).getByRole("button", { name: "Move down" })).toBeDisabled();
  });

  it("disables both buttons when there is a single note", async () => {
    await setup(["only"]);
    expect(within(card(0)).getByRole("button", { name: "Move up" })).toBeDisabled();
    expect(within(card(0)).getByRole("button", { name: "Move down" })).toBeDisabled();
  });

  it("reverts the order and shows an error when saving the order fails", async () => {
    const { user } = await setup();
    mockDb.failNext("reorderNotes");
    await user.click(within(card(2)).getByRole("button", { name: "Move up" }));
    expect(await screen.findByText(/Could not reorder notes/)).toBeInTheDocument();
    await waitFor(() => expect(values()).toEqual(["a", "b", "c"]));
  });

  it("has a keyboard/touch drag handle on each note", async () => {
    await setup();
    expect(within(card(0)).getByRole("button", { name: "Reorder note" })).toBeInTheDocument();
  });
});
