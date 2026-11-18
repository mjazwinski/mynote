import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/App";
import { createNotesStore } from "../../src/state/notesStore";

/** Render the whole app against the MSW mock API and wait until categories are loaded. */
export async function renderApp() {
  const store = createNotesStore();
  const user = userEvent.setup();
  const utils = render(<App store={store} />);
  await waitFor(() => expect(store.getState().categoriesLoaded).toBe(true));
  await waitFor(() => expect(store.getState().notesLoading).toBe(false));
  return { ...utils, store, user };
}

export const noteTextareas = () => screen.queryAllByRole("textbox", { name: /Note \d+ content/ });

export const tab = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${name}\\b`) });
