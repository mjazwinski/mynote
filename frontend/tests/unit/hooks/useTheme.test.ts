import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "../../../src/hooks/useTheme";

type Listener = (event: MediaQueryListEvent) => void;

function mockSystemDark(initial: boolean) {
  const listeners = new Set<Listener>();
  const media = {
    matches: initial,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  };
  vi.spyOn(window, "matchMedia").mockImplementation(() => media as unknown as MediaQueryList);
  return {
    change(dark: boolean) {
      media.matches = dark;
      listeners.forEach((l) => l({ matches: dark } as MediaQueryListEvent));
    },
  };
}

const isDark = () => document.documentElement.classList.contains("dark");

afterEach(() => vi.restoreAllMocks());

describe("useTheme", () => {
  it("uses the stored theme first", () => {
    mockSystemDark(false);
    localStorage.setItem("mynote.theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(isDark()).toBe(true);
  });

  it("falls back to the system preference", () => {
    mockSystemDark(true);
    expect(renderHook(() => useTheme()).result.current.theme).toBe("dark");
  });

  it("ignores invalid stored values", () => {
    mockSystemDark(false);
    localStorage.setItem("mynote.theme", "purple");
    expect(renderHook(() => useTheme()).result.current.theme).toBe("light");
  });

  it("toggle flips the dark class and persists the choice", () => {
    mockSystemDark(false);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(isDark()).toBe(true);
    expect(localStorage.getItem("mynote.theme")).toBe("dark");
    act(() => result.current.toggle());
    expect(isDark()).toBe(false);
    expect(localStorage.getItem("mynote.theme")).toBe("light");
  });

  it("follows OS changes only while no choice is stored", () => {
    const system = mockSystemDark(false);
    const { result } = renderHook(() => useTheme());
    act(() => system.change(true));
    expect(result.current.theme).toBe("dark");

    act(() => result.current.toggle()); // explicit choice: light
    act(() => system.change(true));
    expect(result.current.theme).toBe("light");
  });
});
