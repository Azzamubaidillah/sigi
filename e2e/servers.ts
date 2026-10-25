import path from "node:path";

import type { PlaywrightTestConfig } from "@playwright/test";

import {
  DATA_DIR,
  EMPTY_DIR,
  EMPTY_ORIGIN,
  EMPTY_PORT,
  ORIGIN,
  PORT,
  THESES_DIR,
} from "./world";

/**
 * Shared by the E2E and Lighthouse configs: seed a fresh data directory, then
 * serve the production build against it. `E2E_SKIP_BUILD=1` reuses an
 * existing `.next` (CI builds in its own step; locally it saves the build when
 * only the specs changed).
 */
type WebServer = Exclude<
  NonNullable<PlaywrightTestConfig["webServer"]>,
  readonly unknown[]
>;

const build = process.env.E2E_SKIP_BUILD ? "" : "next build && ";

const environment = (port: number, dataDirectory: string, theses: string) => ({
  NODE_ENV: "production",
  SIGI_DATA_DIR: dataDirectory,
  SIGI_THESES_DIR: theses,
  SIGI_PORT: String(port),
  // Empty: the server accepts its own loopback Host, 127.0.0.1:<port>.
  SIGI_PUBLIC_ORIGIN: "",
  SIGI_LOG_LEVEL: "warn",
});

const serve = (port: number) =>
  `exec next start --hostname 127.0.0.1 --port ${port}`;

/** The seeded site; the first server also builds, so the second finds the build waiting. */
export const seededServer: WebServer = {
  command: `${build}tsx e2e/seed.ts && ${serve(PORT)}`,
  url: ORIGIN,
  timeout: 300_000,
  reuseExistingServer: false,
  stdout: "pipe",
  stderr: "pipe",
  env: environment(PORT, DATA_DIR, THESES_DIR),
};

/** The empty site: a database with nothing in it. */
export const emptyServer: WebServer = {
  command: `tsx e2e/seed.ts --empty && ${serve(EMPTY_PORT)}`,
  url: EMPTY_ORIGIN,
  timeout: 120_000,
  reuseExistingServer: false,
  stdout: "pipe",
  stderr: "pipe",
  env: environment(EMPTY_PORT, EMPTY_DIR, path.join(EMPTY_DIR, "theses")),
};
