import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "tablet-portrait",
      use: { browserName: "chromium", viewport: { width: 800, height: 1280 }, hasTouch: true },
    },
    {
      name: "tablet-landscape",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 }, hasTouch: true },
    },
    {
      name: "desktop-27",
      use: { browserName: "chromium", viewport: { width: 2560, height: 1440 } },
    },
  ],
});
