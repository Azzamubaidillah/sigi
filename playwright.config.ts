import { defineConfig, devices } from "@playwright/test";

import { emptyServer, seededServer } from "./e2e/servers";
import { ORIGIN } from "./e2e/world";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  globalTeardown: "./e2e/teardown.ts",
  use: {
    baseURL: ORIGIN,
    locale: "en-US",
    // The Jakarta clock is the site's own; a browser far from it proves no page depends on the local zone.
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // In order: the first builds, the second reuses the build.
  webServer: [seededServer, emptyServer],
});
