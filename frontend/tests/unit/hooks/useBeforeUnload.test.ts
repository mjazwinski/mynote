import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBeforeUnload } from "../../../src/hooks/useBeforeUnload";

function fireBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event;
}

describe("useBeforeUnload", () => {
  it("does nothing while there are no unsaved changes", () => {
    renderHook(() => useBeforeUnload(false));
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it("asks for confirmation while changes are unsaved and stops afterwards", () => {
    const add = vi.spyOn(window, "addEventListener");
    const { rerender } = renderHook(({ active }) => useBeforeUnload(active), {
      initialProps: { active: true },
    });
    expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(fireBeforeUnload().defaultPrevented).toBe(true);

    rerender({ active: false });
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});
