import { ensureSidebar, expect, freshStart, test, uniq } from "./helpers";

const html = (page: import("@playwright/test").Page) => page.locator("html");

test("toggle switches the whole UI and the choice survives a reload", async ({ page, seed }) => {
  const category = await seed.category(uniq("Theme"));
  await seed.note(category.id, "readable in both themes");
  await freshStart(page, { theme: "light", lastCategoryId: category.id });
  await expect(html(page)).not.toHaveClass(/dark/);
  const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await ensureSidebar(page);
  await page.getByRole("button", { name: /Dark mode/ }).click();
  await expect(html(page)).toHaveClass(/dark/);
  const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bgDark).not.toBe(bgLight);

  // Dialogs use the same tokens.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Delete note" }).first().click();
  const dialogBg = await page
    .getByRole("alertdialog")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dialogBg).not.toBe("rgb(255, 255, 255)");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.reload();
  await expect(html(page)).toHaveClass(/dark/);
});

test.describe("system preference", () => {
  test.use({ colorScheme: "dark" });
  test("without a stored choice the app starts in the OS theme", async ({ page }) => {
    await freshStart(page);
    await expect(html(page)).toHaveClass(/dark/);
  });
});
