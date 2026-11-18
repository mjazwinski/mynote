import { expect, freshStart, noteAreas, openCategory, tabButton, test, uniq } from "./helpers";

test("each category canvas shows only its own notes and marks the active tab", async ({ page, seed }) => {
  const a = await seed.category(uniq("Alpha"));
  const b = await seed.category(uniq("Beta"));
  await seed.note(a.id, "alpha note");
  await seed.note(b.id, "beta note");

  await freshStart(page, { lastCategoryId: a.id });
  await expect(page.getByRole("heading", { level: 1, name: a.name })).toBeVisible();
  await expect(noteAreas(page)).toHaveCount(1);
  await expect(noteAreas(page).first()).toHaveValue("alpha note");

  await openCategory(page, b.name);
  await expect(noteAreas(page)).toHaveCount(1);
  await expect(noteAreas(page).first()).toHaveValue("beta note");
  await expect(tabButton(page, b.name)).toHaveAttribute("aria-current", "page");
});

test("an edit followed by an immediate tab switch is saved", async ({ page, seed }) => {
  const a = await seed.category(uniq("Edit"));
  const b = await seed.category(uniq("Other"));
  const note = await seed.note(a.id, "");

  await freshStart(page, { lastCategoryId: a.id });
  await noteAreas(page).first().fill("typed then switched");
  await openCategory(page, b.name);

  await expect.poll(async () => (await seed.notes(a.id)).find((n) => n.id === note.id)?.content).toBe(
    "typed then switched",
  );
  await page.reload();
  await openCategory(page, a.name);
  await expect(noteAreas(page).first()).toHaveValue("typed then switched");
});

test("reload reopens the last active category", async ({ page, seed }) => {
  const a = await seed.category(uniq("First"));
  const b = await seed.category(uniq("Last"));
  await freshStart(page, { lastCategoryId: a.id });
  await openCategory(page, b.name);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: b.name })).toBeVisible();
});
