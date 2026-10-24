import path from "node:path";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // The origin the app answers on when no public origin is set. The process
  // itself is always reached through a reverse proxy in production.
  SIGI_HOST: z.literal("127.0.0.1").default("127.0.0.1"),
  SIGI_PORT: z.coerce.number().int().min(1024).max(65535).default(3220),
  /**
   * The origin browsers actually use, e.g. https://sigi.example.id. Setting it
   * makes it the only Host the request boundary accepts.
   */
  SIGI_PUBLIC_ORIGIN: z.union([z.literal(""), z.string().url()]).default(""),
  SIGI_DATA_DIR: z.string().min(1).default("./data"),
  SIGI_LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /**
   * Hours between the worker's checks of the exchange's ownership-data page.
   * The files are monthly; a daily look finds each within a day of release.
   */
  SIGI_FETCH_INTERVAL_HOURS: z.coerce.number().min(1).max(168).default(24),
  /** The browser the worker drives; the worker image installs Google Chrome here. */
  SIGI_CHROME_PATH: z.string().default("/usr/bin/google-chrome"),
});

export interface SigiConfig {
  nodeEnv: "development" | "test" | "production";
  /** The origin browsers use; loopback unless a public origin is configured. */
  origin: string;
  /** The Host header the request boundary requires, derived from `origin`. */
  expectedHost: string;
  dataDirectory: string;
  databasePath: string;
  /** Immutable store of every fetched source file, named by SHA-256. */
  landingDirectory: string;
  logLevel: z.infer<typeof environmentSchema>["SIGI_LOG_LEVEL"];
  fetchIntervalMs: number;
  chromePath: string;
  /** Thesis files in this repository (`theses/<slug>/<YYYY-MM-DD>.md`). */
  thesesDirectory: string;
}

const environmentKeys = Object.keys(environmentSchema.shape);
let memoised: { signature: string; config: SigiConfig } | undefined;

/**
 * The configuration for this process, parsed once per distinct environment.
 * The proxy and every page call this per request, so the default call is
 * remembered, keyed on every variable the schema reads plus the working
 * directory. A call with an explicit environment is never remembered. The
 * returned object is shared; callers must not modify it.
 */
export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
  workingDirectory = process.cwd(),
): SigiConfig {
  if (environment !== process.env)
    return parseConfig(environment, workingDirectory);
  const signature = JSON.stringify([
    workingDirectory,
    ...environmentKeys.map((key) => environment[key]),
  ]);
  if (memoised?.signature === signature) return memoised.config;
  const config = parseConfig(environment, workingDirectory);
  memoised = { signature, config };
  return config;
}

function parseConfig(
  environment: NodeJS.ProcessEnv,
  workingDirectory: string,
): SigiConfig {
  const parsed = environmentSchema.parse(environment);
  const publicOrigin = parsed.SIGI_PUBLIC_ORIGIN
    ? new URL(parsed.SIGI_PUBLIC_ORIGIN)
    : null;
  const dataDirectory = path.resolve(workingDirectory, parsed.SIGI_DATA_DIR);
  const loopback = `${parsed.SIGI_HOST}:${parsed.SIGI_PORT}`;
  return {
    nodeEnv: parsed.NODE_ENV,
    origin: publicOrigin ? publicOrigin.origin : `http://${loopback}`,
    expectedHost: publicOrigin ? publicOrigin.host : loopback,
    dataDirectory,
    databasePath: path.join(dataDirectory, "sigi.db"),
    landingDirectory: path.join(dataDirectory, "landing"),
    logLevel: parsed.SIGI_LOG_LEVEL,
    fetchIntervalMs: Math.round(parsed.SIGI_FETCH_INTERVAL_HOURS * 3_600_000),
    chromePath: parsed.SIGI_CHROME_PATH,
    thesesDirectory: path.resolve(workingDirectory, "theses"),
  };
}
