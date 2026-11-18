import { expect, type APIRequestContext, type Page, test as base } from "@playwright/test";
import type { Category, Note } from "../../src/api/types";

const API = "/api/v1";

export const uniq = (name: string) => `${name} ${Math.random().toString(36).slice(2, 8)}`;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** API seeding helpers that remember created categories and delete them afterwards. */
export class Seed {
  private created: string[] = [];
  constructor(private readonly request: APIRequestContext) {}

  async category(name: string): Promise<Category> {
    const res = await this.request.post(`${API}/categories`, { data: { name } });
    expect(res.status()).toBe(201);
    const category = (await res.json()) as Category;
    this.created.push(category.id);
    return category;
  }

  async note(categoryId: string, content: string): Promise<Note> {
    const res = await this.request.post(`${API}/categories/${categoryId}/notes`, { data: { content } });
    expect(res.status()).toBe(201);
    return (await res.json()) as Note;
  }

  async notes(categoryId: string): Promise<Note[]> {
    const res = await this.request.get(`${API}/categories/${categoryId}/notes`);
    return res.ok() ? ((await res.json()) as Note[]) : [];
  }

  async cleanup() {
    for (const id of this.created) await this.request.delete(`${API}/categories/${id}`);
  }
}

export const test = base.extend<{ seed: Seed }>({
  seed: async ({ request }, use) => {
    const seed = new Seed(request);
    await use(seed);
    await seed.cleanup();
  },
});

export { expect };

export const tabButton = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Category tabs" }).getByRole("button", {
    name: new RegExp(`^${escapeRegExp(name)}`),
  });

/** Opens the drawer on narrow screens (sidebar hidden below 1024 px) when needed. */
export async function ensureSidebar(page: Page) {
  const menu = page.getByRole("button", { name: "Open categories" });
  if (await menu.isVisible()) await menu.click();
}

export async function openCategory(page: Page, name: string) {
  await ensureSidebar(page);
  await tabButton(page, name).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

export const noteAreas = (page: Page) => page.getByRole("textbox", { name: /Note \d+ content/ });

/** Reset client-side preferences so each test starts from a known state. */
export async function freshStart(page: Page, opts: { theme?: "light" | "dark"; lastCategoryId?: string } = {}) {
  await page.addInitScript(
    ({ theme, lastCategoryId }) => {
      if (sessionStorage.getItem("e2e-init")) return;
      sessionStorage.setItem("e2e-init", "1");
      localStorage.clear();
      if (theme) localStorage.setItem("mynote.theme", theme);
      if (lastCategoryId) localStorage.setItem("mynote.lastCategoryId", lastCategoryId);
    },
    { theme: opts.theme ?? "", lastCategoryId: opts.lastCategoryId ?? "" },
  );
  await page.goto("/");
}
