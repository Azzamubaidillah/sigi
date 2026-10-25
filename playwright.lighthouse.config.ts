import { defineConfig } from "@playwright/test";

import { seededServer } from "./e2e/servers";
import { ORIGIN } from "./e2e/world";

// Separate from the E2E config: Lighthouse is slow and drives its own Chromium.
// Playwright only seeds and serves the site here; the audit runs in a plain
// Node process (lighthouse/run.ts) because Lighthouse's modules do not survive
// Playwright's TypeScript transform.
export default defineConfig({
  testDir: "./lighthouse",
  testMatch: "accessibility.lh.ts",
  reporter: [["list"]],
  globalTeardown: "./e2e/teardown.ts",
  use: { baseURL: ORIGIN },
  webServer: seededServer,
});
