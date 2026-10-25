import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const run = promisify(execFile);

// Playwright only seeds and serves the site; the audit runs in a plain Node
// process (see run.ts).
test("Lighthouse accessibility score is at least 90 on every page, in both languages and colour schemes", async ({
  baseURL,
}) => {
  test.setTimeout(1_200_000);
  const result = await run("tsx", ["lighthouse/run.ts"], {
    env: { ...process.env, BASE_URL: baseURL },
    maxBuffer: 16 * 1024 * 1024,
  }).catch((error: { stdout?: string; stderr?: string }) => {
    throw new Error(`${error.stdout ?? ""}${error.stderr ?? ""}`);
  });
  console.log(result.stdout);
  expect(result.stdout).toContain("lighthouse accessibility:");
});
