import { useTheme } from "../hooks/useTheme";
import { MoonIcon, SunIcon } from "./Icons";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={toggle}
      className="inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-fg hover:bg-surface-raised"
    >
      {dark ? <MoonIcon /> : <SunIcon />}
      Dark mode
      <span className="ml-auto text-fg-muted">{dark ? "On" : "Off"}</span>
    </button>
  );
}
