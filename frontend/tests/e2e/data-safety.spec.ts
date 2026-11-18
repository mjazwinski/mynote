import { ensureSidebar, expect, freshStart, noteAreas, openCategory, test, uniq } from "./helpers";

test("fresh start with no categories shows the empty state (scenario 1)", async ({ page }) => {
  await page.route("**/api/v1/categories", (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: [] }) : route.continue(),
  );
  await freshStart(page);
  await expect(page.getByRole("button", { name: "Create your first category" })).toBeVisible();
});

test("create a category; a case-insensitive duplicate is rejected (scenario 2)", async ({ page }) => {
  const name = uniq("Work");
  await freshStart(page);
  await ensureSidebar(page);
  await page.getByRole("button", { name: "Add category" }).click();
  await page.getByLabel("Category name").fill(name);
  await page.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const created = (await (await page.request.get("/api/v1/categories")).json()) as { id: string; name: string }[];
  const id = created.find((c) => c.name === name)!.id;
  try {
    await ensureSidebar(page);
    await page.getByRole("button", { name: "Add category" }).click();
    await page.getByLabel("Category name").fill(name.toUpperCase());
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(page.getByRole("alert")).toContainText("already exists");
  } finally {
    await page.request.delete(`/api/v1/categories/${id}`);
  }
});

test("server down: save failure is shown, draft survives reload, retry saves (scenario 5)", async ({ page, seed }) => {
  const a = await seed.category(uniq("Down"));
  const b = await seed.category(uniq("Elsewhere"));
  const note = await seed.note(a.id, "");
  await freshStart(page, { lastCategoryId: a.id });

  // Simulate the backend being unreachable for note saves.
  await page.route("**/api/v1/notes/**", (route) => route.abort("connectionrefused"));
  await noteAreas(page).first().fill("written while offline");
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByText("Save failed")).toBeVisible();

  // Switching category is blocked with Retry / Discard / Cancel.
  await ensureSidebar(page);
  await page
    .getByRole("navigation", { name: "Category tabs" })
    .getByRole("button", { name: new RegExp(`^${b.name}`) })
    .click();
  const dialog = page.getByRole("alertdialog", { name: "Unsaved changes" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1, name: a.name })).toBeVisible();

  // Reload keeps the draft (allow leaving despite the beforeunload prompt).
  page.once("dialog", (d) => void d.accept());
  await page.reload();
  await expect(noteAreas(page).first()).toHaveValue("written while offline");
  await expect(page.getByRole("status").filter({ hasText: "Unsaved" })).toBeVisible();

  // Backend back: blur saves it.
  await page.unroute("**/api/v1/notes/**");
  await noteAreas(page).first().click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect.poll(async () => (await seed.notes(a.id)).find((n) => n.id === note.id)?.content).toBe(
    "written while offline",
  );
  await openCategory(page, b.name);
});

test("closing the tab with unsaved changes asks for confirmation (scenario 6)", async ({ page, seed }) => {
  const a = await seed.category(uniq("Leave"));
  await seed.note(a.id, "");
  await freshStart(page, { lastCategoryId: a.id });
  await page.route("**/api/v1/notes/**", (route) => route.abort("connectionrefused"));
  await noteAreas(page).first().fill("not yet saved");

  const dialogPromise = page.waitForEvent("dialog");
  void page.close({ runBeforeUnload: true });
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
});
