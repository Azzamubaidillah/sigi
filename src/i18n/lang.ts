/**
 * The two languages of the site (PRD F11). A visitor's choice is a cookie set
 * by `/lang`; without one, the browser's Accept-Language decides, and English
 * is the default. Data tables keep their source spellings in both.
 */
export const LANGS = ["en", "id"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_COOKIE = "sigi-lang";
export const LANG_COOKIE_MAX_AGE = 365 * 24 * 3600;

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "id";
}

/** The first language in an Accept-Language header that the site has, by weight; null if none. */
function fromAcceptLanguage(header: string): Lang | null {
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const weight = params
        .map((param) => /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(param)?.[1])
        .find((value) => value !== undefined);
      return {
        primary: tag.trim().toLowerCase().split("-")[0],
        weight: weight === undefined ? 1 : Number(weight),
        index,
      };
    })
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const entry of ranked) {
    // "in" is the old ISO code for Indonesian, still sent by some Android builds.
    if (entry.primary === "id" || entry.primary === "in") return "id";
    if (entry.primary === "en") return "en";
  }
  return null;
}

export function resolveLang(
  cookie: string | undefined,
  acceptLanguage: string | null,
): Lang {
  if (isLang(cookie)) return cookie;
  return (acceptLanguage && fromAcceptLanguage(acceptLanguage)) || "en";
}

/**
 * Where `/lang` may send the visitor back to: a path on this site, never a
 * full URL or a protocol-relative one.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.includes("\\") || /[\u0000-\u001f]/.test(next)) return "/";
  return next;
}
