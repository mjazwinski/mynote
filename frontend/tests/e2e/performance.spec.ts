import { expect, freshStart, noteAreas, openCategory, test, uniq } from "./helpers";

test("switching to a category with 200 notes renders in under 1 second (SC-004)", async ({ page, seed, request }, info) => {
  test.skip(info.project.name !== "desktop-27", "Measured once, on the desktop project");
  test.setTimeout(120_000);
  const big = await seed.category(uniq("Big"));
  const small = await seed.category(uniq("Small"));
  for (let i = 0; i < 200; i += 20) {
    await Promise.all(
      Array.from({ length: 20 }, (_, j) =>
        request.post(`/api/v1/categories/${big.id}/notes`, { data: { content: `note ${i + j}` } }),
      ),
    );
  }

  await freshStart(page, { lastCategoryId: small.id });
  await expect(page.getByRole("heading", { level: 1, name: small.name })).toBeVisible();

  const started = Date.now();
  await openCategory(page, big.name);
  await expect(noteAreas(page)).toHaveCount(200);
  const elapsed = Date.now() - started;
  console.log(`Canvas with 200 notes rendered in ${elapsed} ms`);
  expect(elapsed).toBeLessThan(1000);
});
