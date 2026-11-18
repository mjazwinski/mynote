import type { Locator, Page } from "@playwright/test";
import { ensureSidebar, expect, freshStart, noteAreas, tabButton, test, uniq } from "./helpers";

const handles = (page: Page) => page.getByRole("button", { name: "Reorder note" });

async function centre(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drag with the mouse in small steps (dnd-kit needs intermediate move events). */
async function mouseDrag(page: Page, from: Locator, to: { x: number; y: number }) {
  const start = await centre(from);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.up();
}

/** Touch drag via CDP touch events: press, hold past the 200 ms activation delay, move, release. */
async function touchDrag(page: Page, from: Locator, to: { x: number; y: number }) {
  const start = await centre(from);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  await touch("touchStart", start.x, start.y);
  await page.waitForTimeout(350);
  for (let i = 1; i <= 15; i++) {
    await touch("touchMove", start.x + ((to.x - start.x) * i) / 15, start.y + ((to.y - start.y) * i) / 15);
    await page.waitForTimeout(16);
  }
  await touch("touchEnd", to.x, to.y);
}

async function values(page: Page) {
  return noteAreas(page).evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
}

test("drag the last note to the first position; the order survives a reload", async ({ page, seed }, info) => {
  const category = await seed.category(uniq("Reorder"));
  for (const t of ["one", "two", "three"]) await seed.note(category.id, t);
  await freshStart(page, { lastCategoryId: category.id });
  await expect(noteAreas(page)).toHaveCount(3);

  const target = await centre(noteAreas(page).first());
  const isTouch = info.project.use.hasTouch === true;
  if (isTouch) await touchDrag(page, handles(page).nth(2), target);
  else await mouseDrag(page, handles(page).nth(2), target);

  await expect.poll(() => values(page)).toEqual(["three", "one", "two"]);
  await expect.poll(async () => (await seed.notes(category.id)).map((n) => n.content)).toEqual([
    "three",
    "one",
    "two",
  ]);
  await page.reload();
  await expect.poll(() => values(page)).toEqual(["three", "one", "two"]);
});

test("Move up button reorders and persists", async ({ page, seed }) => {
  const category = await seed.category(uniq("Buttons"));
  for (const t of ["one", "two"]) await seed.note(category.id, t);
  await freshStart(page, { lastCategoryId: category.id });
  await page.getByRole("button", { name: "Move up" }).nth(1).click();
  await expect.poll(() => values(page)).toEqual(["two", "one"]);
  await page.reload();
  await expect.poll(() => values(page)).toEqual(["two", "one"]);
});

test("dropping a note on another category tab does not move it", async ({ page, seed }, info) => {
  test.skip(info.project.name === "tablet-portrait", "Sidebar is a closed drawer in portrait; tabs are not on screen while dragging");
  const category = await seed.category(uniq("Source"));
  const other = await seed.category(uniq("Target"));
  for (const t of ["one", "two"]) await seed.note(category.id, t);
  await freshStart(page, { lastCategoryId: category.id });
  await ensureSidebar(page);
  await expect(noteAreas(page)).toHaveCount(2);

  await mouseDrag(page, handles(page).nth(0), await centre(tabButton(page, other.name)));

  await expect.poll(() => values(page)).toEqual(["one", "two"]);
  expect((await seed.notes(other.id)).length).toBe(0);
  expect((await seed.notes(category.id)).map((n) => n.content)).toEqual(["one", "two"]);
});
