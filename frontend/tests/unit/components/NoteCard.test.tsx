import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockDb } from "../../mocks/db";
import { noteTextareas, renderApp } from "../helpers";

async function setup(content = "hello") {
  const category = mockDb.seedCategory("Work");
  const note = mockDb.seedNote(category.id, content);
  const app = await renderApp();
  const textarea = noteTextareas()[0];
  return { ...app, note, textarea };
}

const status = () => screen.getAllByRole("status")[0];

describe("NoteCard auto-save", () => {
  it("does not save on blur when nothing changed", async () => {
    const { user, textarea } = await setup();
    mockDb.calls = [];
    await user.click(textarea);
    await user.tab();
    expect(mockDb.calls.filter((c) => c.startsWith("PATCH"))).toEqual([]);
    expect(status()).toHaveTextContent("Saved");
  });

  it("saves on blur after editing and shows Saved", async () => {
    const { user, textarea, note } = await setup("");
    await user.type(textarea, "new text");
    expect(status()).toHaveTextContent("Unsaved");
    await user.tab();
    await waitFor(() => expect(status()).toHaveTextContent("Saved"));
    expect(mockDb.notes.find((n) => n.id === note.id)?.content).toBe("new text");
    expect(mockDb.calls.filter((c) => c.startsWith("PATCH"))).toHaveLength(1);
  });

  it("shows Save failed, keeps content and draft, and Retry recovers", async () => {
    const { user, textarea, note } = await setup("");
    mockDb.failNext("updateNote");
    await user.type(textarea, "important");
    await user.tab();

    await screen.findByText("Save failed");
    expect(textarea).toHaveValue("important");
    expect(JSON.parse(localStorage.getItem("mynote.drafts")!)[note.id].content).toBe("important");

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(status()).toHaveTextContent("Saved"));
    expect(localStorage.getItem("mynote.drafts")).toBeNull();
    expect(mockDb.notes[0].content).toBe("important");
  });

  it("keeps the draft when the server is unreachable", async () => {
    const { user, textarea } = await setup("");
    mockDb.failNext("updateNote", { status: 0, network: true });
    await user.type(textarea, "offline edit");
    await user.tab();
    await screen.findByText("Save failed");
    expect(screen.getByText(/kept on this device/)).toBeInTheDocument();
  });

  it("restores a draft after reload and marks it Unsaved", async () => {
    const category = mockDb.seedCategory("Work");
    const note = mockDb.seedNote(category.id, "server");
    localStorage.setItem(
      "mynote.drafts",
      JSON.stringify({ [note.id]: { content: "draft", updatedAt: "2026-01-01T00:00:00Z" } }),
    );
    await renderApp();
    expect(noteTextareas()[0]).toHaveValue("draft");
    expect(status()).toHaveTextContent("Unsaved");
  });
});
