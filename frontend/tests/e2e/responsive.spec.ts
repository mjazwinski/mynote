import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ensureSidebar, expect, freshStart, noteAreas, test, uniq } from "./helpers";

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Every visible button/input/textarea is at least 44×44 CSS px (constitution II). */
async function assertTouchTargets(page: Page) {
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("button, input, a[href]"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ label: el.getAttribute("aria-label") ?? el.textContent?.trim(), rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && (rect.width < 43.5 || rect.height < 43.5))
      .map(({ label, rect }) => `${label} ${Math.round(rect.width)}x${Math.round(rect.height)}`),
  );
  expect(small).toEqual([]);
}

async function assertContrast(page: Page) {
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(" ")))).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test("add/edit, reorder and delete flows are usable with no layout breakage", async ({ page, seed }) => {
      const category = await seed.category(uniq(`Layout ${theme}`));
      await seed.note(category.id, "first note with some text");
      await seed.note(category.id, "second note");
      await freshStart(page, { theme, lastCategoryId: category.id });
      await expect(noteAreas(page)).toHaveCount(2);

      // Add + edit
      await page.getByRole("button", { name: "Add note" }).click();
      await expect(noteAreas(page)).toHaveCount(3);
      await noteAreas(page).nth(2).fill("third note");
      await page.getByRole("heading", { level: 1 }).click();
      await expect(page.getByRole("status").filter({ hasText: "Saved" })).toHaveCount(3);

      await assertNoHorizontalOverflow(page);
      await assertTouchTargets(page);
      await assertContrast(page);

      // Reorder via button
      await page.getByRole("button", { name: "Move up" }).nth(2).click();
      await expect(noteAreas(page).nth(1)).toHaveValue("third note");

      // Delete dialog (with the category warning) is readable and fits
      await page.getByRole("button", { name: "Remove category" }).click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog.getByRole("alert")).toContainText("contains 3 notes");
      await assertContrast(page);
      await assertNoHorizontalOverflow(page);
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await page.getByRole("button", { name: "Delete note" }).first().click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete note" }).click();
      await expect(noteAreas(page)).toHaveCount(2);

      // Sidebar (inline on wide screens, drawer on narrow) is reachable and readable
      await ensureSidebar(page);
      await expect(page.getByRole("navigation", { name: "Category tabs" })).toBeVisible();
      await assertTouchTargets(page);
      await assertContrast(page);
    });
  });
}
