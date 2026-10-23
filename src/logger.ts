import pino, { type Logger } from "pino";

import type { SigiConfig } from "./config";

/**
 * `error` is serialised like `err`. An Error's `message` and `stack` are
 * non-enumerable and pino applies its error serializer only to `err`, so
 * without this `logger.error({ error })` writes `"error":{}`.
 */
export const loggerSerializers = { error: pino.stdSerializers.err };

export function createLogger(
  processName: "sigi-worker" | "sigi-cli",
  config: Pick<SigiConfig, "logLevel" | "nodeEnv">,
): Logger {
  return pino({
    base: { process: processName },
    level: config.logLevel,
    serializers: loggerSerializers,
    // Sigi holds no credentials; these are redacted in case a request object
    // is ever logged whole.
    redact: {
      paths: ["*.headers.cookie", "*.headers.authorization"],
      censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport:
      config.nodeEnv === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });
}
