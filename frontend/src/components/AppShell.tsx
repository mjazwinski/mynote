import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MenuIcon } from "./Icons";

interface AppShellContextValue {
  closeDrawer: () => void;
}

const AppShellContext = createContext<AppShellContextValue>({ closeDrawer: () => {} });

export const useAppShell = () => useContext(AppShellContext);

export interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

/**
 * Layout: left sidebar (always visible ≥ 1024 px, a drawer below that) + main area.
 * No hover-only behaviour; the drawer opens/closes by tap or keyboard.
 */
export function AppShell({ sidebar, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const contextValue = useMemo(() => ({ closeDrawer }), [closeDrawer]);

  // Escape closes the drawer (keyboard users on tablets with keyboards).
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="flex h-full min-h-0 bg-bg text-fg">
        {drawerOpen && (
          <div
            data-testid="drawer-overlay"
            className="fixed inset-0 z-30 bg-overlay lg:hidden"
            onClick={closeDrawer}
            aria-hidden="true"
          />
        )}
        <aside
          id="app-sidebar"
          aria-label="Categories"
          data-open={drawerOpen}
          className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface transition-transform lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 xl:w-72 2xl:w-80 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center border-b border-border bg-surface px-2 lg:hidden">
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-fg"
              aria-controls="app-sidebar"
              aria-expanded={drawerOpen}
              aria-label={drawerOpen ? "Close categories" : "Open categories"}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <MenuIcon />
            </button>
            <span className="ml-2 font-semibold">MyNote</span>
          </div>
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
