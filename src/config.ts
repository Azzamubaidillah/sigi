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
   * The origin browsers actually use, e.g. https://sigi.example.id.
   *
   * Setting it makes the deployment public-facing: it becomes the origin the
   * CSRF boundary requires, the host the request boundary demands, and the
   * reason session cookies are marked secure.
   */
  SIGI_PUBLIC_ORIGIN: z.union([z.literal(""), z.string().url()]).default(""),
  /**
   * Whether a reverse proxy in front of this app sets X-Forwarded-For. Off by
   * default: the header is attacker-supplied otherwise, and believing it would
   * let one client mint a fresh rate-limit bucket per request.
   */
  SIGI_TRUSTED_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SIGI_SESSION_TTL_HOURS: z.coerce.number().min(0.25).max(24).default(2),
  SIGI_REMEMBER_TTL_DAYS: z.coerce.number().min(1).max(30).default(7),
  SIGI_DATA_DIR: z.string().min(1).default("./data"),
  SIGI_LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SIGI_PASSCODE_HASH: z.string().default(""),
  SIGI_SESSION_SECRET: z.union([z.literal(""), z.string().min(32)]).default(""),
});

export interface SessionLifetimeConfig {
  sessionSeconds: number;
  rememberedSeconds: number;
}

export interface SigiConfig {
  nodeEnv: "development" | "test" | "production";
  /** The origin browsers use; loopback unless a public origin is configured. */
  origin: string;
  /** The Host header the request boundary requires, derived from `origin`. */
  expectedHost: string;
  /** Whether session cookies may be marked secure, i.e. the origin is https. */
  secureCookies: boolean;
  trustProxyHeaders: boolean;
  sessionLifetime: SessionLifetimeConfig;
  dataDirectory: string;
  databasePath: string;
  /** Immutable store of every uploaded source file, named by SHA-256. */
  landingDirectory: string;
  logLevel: z.infer<typeof environmentSchema>["SIGI_LOG_LEVEL"];
  passcodeHash?: string;
  sessionSecret?: string;
}

const environmentKeys = Object.keys(environmentSchema.shape);
let memoised: { signature: string; config: SigiConfig } | undefined;

/**
 * The configuration for this process, parsed once per distinct environment.
 *
 * The proxy and every page call this per request, so the default call is
 * remembered, keyed on every variable the schema reads plus the working
 * directory: a changed value (as the tests make) parses afresh, and an invalid
 * value still throws every time. A call with an explicit environment is never
 * remembered. The returned object is shared; callers must not modify it.
 */
export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
  workingDirectory = process.cwd(),
): SigiConfig {
  if (environment !== process.env) {
    return parseConfig(environment, workingDirectory);
  }
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
  if (publicOrigin && publicOrigin.protocol !== "https:") {
    throw new Error(
      "SIGI_PUBLIC_ORIGIN must be https. A public deployment over http would expose the passcode and session cookie in transit.",
    );
  }
  const dataDirectory = path.resolve(workingDirectory, parsed.SIGI_DATA_DIR);
  const loopback = `${parsed.SIGI_HOST}:${parsed.SIGI_PORT}`;

  return {
    nodeEnv: parsed.NODE_ENV,
    origin: publicOrigin ? publicOrigin.origin : `http://${loopback}`,
    expectedHost: publicOrigin ? publicOrigin.host : loopback,
    secureCookies: publicOrigin !== null,
    trustProxyHeaders: parsed.SIGI_TRUSTED_PROXY,
    sessionLifetime: {
      sessionSeconds: Math.round(parsed.SIGI_SESSION_TTL_HOURS * 60 * 60),
      rememberedSeconds: Math.round(
        parsed.SIGI_REMEMBER_TTL_DAYS * 24 * 60 * 60,
      ),
    },
    dataDirectory,
    databasePath: path.join(dataDirectory, "sigi.db"),
    landingDirectory: path.join(dataDirectory, "landing"),
    logLevel: parsed.SIGI_LOG_LEVEL,
    passcodeHash: parsed.SIGI_PASSCODE_HASH || undefined,
    sessionSecret: parsed.SIGI_SESSION_SECRET || undefined,
  };
}
