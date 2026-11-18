import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../../src/components/ConfirmDialog";

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const props = {
    title: "Delete this note?",
    message: "Gone forever.",
    confirmLabel: "Delete note",
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ConfirmDialog {...props} />);
  return props;
}

describe("ConfirmDialog", () => {
  it("is an alertdialog with Cancel focused by default", () => {
    renderDialog();
    expect(screen.getByRole("alertdialog", { name: "Delete this note?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("Cancel and Escape call onCancel without confirming", async () => {
    const props = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.keyboard("{Escape}");
    expect(props.onCancel).toHaveBeenCalledTimes(2);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("shows the optional warning as an alert", () => {
    renderDialog({ warning: "This category contains 3 notes." });
    expect(screen.getByRole("alert")).toHaveTextContent("This category contains 3 notes.");
  });

  it("has no warning block when none is given", () => {
    renderDialog();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables buttons while pending and shows an error on failure", async () => {
    let reject: (e: Error) => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    renderDialog({ onConfirm });
    await userEvent.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    reject(new Error("boom"));
    await waitFor(() => expect(screen.getByText(/Deletion failed/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Delete note" })).toBeEnabled();
  });
});
