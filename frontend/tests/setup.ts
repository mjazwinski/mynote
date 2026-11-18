import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { mockDb } from "./mocks/db";
import { server } from "./mocks/server";

// Node >= 25 ships a global `localStorage` that shadows jsdom's and is unusable without
// --localstorage-file. Install a spec-compatible in-memory Storage on both globals.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}
const memoryStorage = new MemoryStorage();
for (const target of [globalThis, window]) {
  Object.defineProperty(target, "localStorage", {
    configurable: true,
    get: () => memoryStorage,
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  localStorage.clear();
  mockDb.reset();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());

// jsdom lacks matchMedia; default to "light, wide screen".
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
