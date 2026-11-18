import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
export const THEME_KEY = "mynote.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

const systemTheme = (): Theme => (window.matchMedia(DARK_QUERY).matches ? "dark" : "light");

/** Light/dark theme (FR-023): stored choice wins, otherwise follow the OS preference. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Follow OS changes only while the user has not made an explicit choice.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (storedTheme() === null) setTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // storage unavailable: applies for this session only
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
