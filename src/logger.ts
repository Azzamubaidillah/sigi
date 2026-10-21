import pino, { type Logger } from "pino";

import type { SigiConfig } from "./config";

export const redactedPaths = [
  "passcode",
  "password",
  "secret",
  "session",
  "token",
  "csrfToken",
  "passcodeHash",
  "sessionSecret",
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers.set-cookie",
  "*.passcode",
  "*.password",
  "*.secret",
  "*.session",
  "*.token",
  "*.csrfToken",
  "*.passcodeHash",
  "*.sessionSecret",
];

/**
 * `error` is serialised like `err`. An Error's `message` and `stack` are
 * non-enumerable and pino applies its error serializer only to `err`, so
 * without this `logger.error({ error })` writes `"error":{}`.
 */
export const loggerSerializers = { error: pino.stdSerializers.err };

export function createLogger(
  processName: "sigi-web" | "sigi-cli",
  config: Pick<SigiConfig, "logLevel" | "nodeEnv">,
): Logger {
  return pino({
    base: { process: processName },
    level: config.logLevel,
    serializers: loggerSerializers,
    redact: { paths: redactedPaths, censor: "[REDACTED]" },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport:
      config.nodeEnv === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });
}
