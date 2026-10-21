/**
 * A same-origin POST carrying a fresh CSRF pair: the csrf route sets the
 * cookie half and returns the header half (double submit).
 */
export async function ownerPost(
  url: string,
  body: FormData | Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const tokenResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  const { csrfToken } = (await tokenResponse.json()) as { csrfToken: string };
  const response = await fetch(url, {
    method: "POST",
    headers:
      body instanceof FormData
        ? { "x-csrf-token": csrfToken }
        : { "x-csrf-token": csrfToken, "content-type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return { ok: response.ok, status: response.status, data };
}
