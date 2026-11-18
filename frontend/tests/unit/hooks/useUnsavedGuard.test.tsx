import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockDb } from "../../mocks/db";
import { noteTextareas, renderApp, tab } from "../helpers";

async function setup() {
  const work = mockDb.seedCategory("Work");
  const home = mockDb.seedCategory("Home");
  const workNote = mockDb.seedNote(work.id, "work note");
  mockDb.seedNote(home.id, "home note");
  const app = await renderApp();
  return { ...app, work, home, workNote };
}

const canvasTitle = () => screen.getByRole("heading", { level: 1 });

describe("category switch guard", () => {
  it("switches immediately when nothing is unsaved and shows only that category's notes", async () => {
    const { user } = await setup();
    expect(canvasTitle()).toHaveTextContent("Work");
    await user.click(tab("Home"));
    await waitFor(() => expect(canvasTitle()).toHaveTextContent("Home"));
    await waitFor(() => expect(noteTextareas().map((t) => (t as HTMLTextAreaElement).value)).toEqual(["home note"]));
    expect(tab("Home")).toHaveAttribute("aria-current", "page");
    expect(tab("Work")).not.toHaveAttribute("aria-current");
  });

  it("saves dirty notes before switching", async () => {
    const { user, store, workNote } = await setup();
    // Edit via the store so no blur-save happens before the switch is requested.
    store.editNote(workNote.id, "edited before switch");
    await user.click(tab("Home"));
    await waitFor(() => expect(canvasTitle()).toHaveTextContent("Home"));
    expect(mockDb.notes.find((n) => n.id === workNote.id)?.content).toBe("edited before switch");
  });

  it("stays on the canvas and offers Retry when saving fails; Retry then switches", async () => {
    const { user, store, workNote } = await setup();
    store.editNote(workNote.id, "unsaved");
    mockDb.failNext("updateNote");
    await user.click(tab("Home"));

    const dialog = await screen.findByRole("alertdialog", { name: "Unsaved changes" });
    expect(canvasTitle()).toHaveTextContent("Work");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(canvasTitle()).toHaveTextContent("Home"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockDb.notes.find((n) => n.id === workNote.id)?.content).toBe("unsaved");
  });

  it("Discard changes & switch restores server content and removes the draft", async () => {
    const { user, store, workNote } = await setup();
    store.editNote(workNote.id, "throw away");
    mockDb.failNext("updateNote");
    await user.click(tab("Home"));
    await user.click(await screen.findByRole("button", { name: "Discard changes & switch" }));
    await waitFor(() => expect(canvasTitle()).toHaveTextContent("Home"));
    expect(localStorage.getItem("mynote.drafts")).toBeNull();

    await user.click(tab("Work"));
    await waitFor(() => expect(noteTextareas()[0]).toHaveValue("work note"));
  });

  it("Cancel keeps the user on the current category with content intact", async () => {
    const { user, store, workNote } = await setup();
    store.editNote(workNote.id, "keep me");
    mockDb.failNext("updateNote");
    await user.click(tab("Home"));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(canvasTitle()).toHaveTextContent("Work");
    expect(noteTextareas()[0]).toHaveValue("keep me");
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });

  it("remembers the last active category for the next launch", async () => {
    const { user, home, unmount } = await setup();
    await user.click(tab("Home"));
    await waitFor(() => expect(localStorage.getItem("mynote.lastCategoryId")).toBe(home.id));
    unmount();
    await renderApp();
    expect(canvasTitle()).toHaveTextContent("Home");
  });

  it("falls back to the first category when the remembered one no longer exists", async () => {
    localStorage.setItem("mynote.lastCategoryId", "f".repeat(24));
    await setup();
    expect(canvasTitle()).toHaveTextContent("Work");
  });
});
