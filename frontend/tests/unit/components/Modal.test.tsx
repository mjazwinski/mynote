import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../../../src/components/Modal";

function Harness({ onClose }: { onClose: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      title="Delete this note?"
      role="alertdialog"
      onClose={onClose}
      initialFocusRef={cancelRef}
      footer={
        <>
          <button ref={cancelRef}>Cancel</button>
          <button>Delete</button>
        </>
      }
    >
      <p>Body</p>
    </Modal>
  );
}

describe("Modal", () => {
  it("renders an accessible dialog with title", () => {
    render(<Harness onClose={() => {}} />);
    const dialog = screen.getByRole("alertdialog", { name: "Delete this note?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("focuses the initial focus element", () => {
    render(<Harness onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps focus with Tab and Shift+Tab", async () => {
    render(<Harness onClose={() => {}} />);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const del = screen.getByRole("button", { name: "Delete" });
    await userEvent.tab();
    expect(del).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(del).toHaveFocus();
  });

  it("restores focus to the previously focused element on close", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Harness onClose={() => {}} />);
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
