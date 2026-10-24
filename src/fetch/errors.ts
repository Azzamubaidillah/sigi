/**
 * A failure as one line for `fetch_runs` and /data. Node's fetch reports
 * every network failure as "fetch failed" and puts the reason (a timeout, a
 * reset, DNS) in `cause`, so the cause is appended.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause as { message?: string; code?: string } | undefined;
  const detail = cause ? (cause.code ?? cause.message) : undefined;
  return detail && !error.message.includes(detail)
    ? `${error.message} (${detail})`
    : error.message;
}
