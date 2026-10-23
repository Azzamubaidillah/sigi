/**
 * The exchange's share-ownership data page lists every file it offers as an
 * object with a title (`Description`) and a path (`Prospectus`). The monthly
 * >1% holder workbooks are titled "Pemegang Saham di Atas 1% per 30 September
 * 2026"; the page also lists other files (by investor type, daily 5%
 * holders), which Sigi ignores.
 */

export const IDX_ORIGIN = "https://www.idx.co.id";
export const S1_PAGE_URL = `${IDX_ORIGIN}/id/perusahaan-tercatat/data-kepemilikan-saham/`;

export interface ListedFile {
  description: string;
  /** A full URL so far; a path relative to the site is accepted too. */
  path: string;
}

export interface S1Listing {
  title: string;
  url: string;
  /** YYYY-MM-DD, from the title. */
  recordDate: string;
}

const MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

const TITLE = /^pemegang saham di atas 1\s*% per (\d{1,2}) ([a-z]+) (\d{4})$/;

function titleDate(title: string): string | null {
  const match = TITLE.exec(title.trim().replace(/\s+/g, " ").toLowerCase());
  if (!match) return null;
  const month = MONTHS[match[2]];
  const day = Number(match[1]);
  if (!month || day < 1 || day > 31) return null;
  const date = `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Reject 31 June and the like rather than let Date roll it over.
  return new Date(`${date}T00:00:00Z`).toISOString().startsWith(date)
    ? date
    : null;
}

/** The file's URL if it is an .xlsx in the exchange's own /Media/ store. */
function mediaUrl(path: string): string | null {
  let url: URL;
  try {
    url = new URL(path, IDX_ORIGIN);
  } catch {
    return null;
  }
  return url.origin === IDX_ORIGIN &&
    /^\/Media\/[\w./-]+\.xlsx$/i.test(url.pathname) &&
    url.search === ""
    ? url.href
    : null;
}

/**
 * The monthly >1% workbooks among the page's files, oldest record date first,
 * so months publish in order. The page gives no publication time (its
 * `ListingDate` is the record date), so two files for one month are taken in
 * URL order; in practice a re-issue is found by a later daily check, after
 * the original. Anything under a matching title that is not an .xlsx in the
 * exchange's /Media/ store is skipped, not followed.
 */
export function s1Listings(files: readonly ListedFile[]): S1Listing[] {
  const byUrl = new Map<string, S1Listing>();
  for (const file of files) {
    const recordDate = titleDate(file.description);
    const url = mediaUrl(file.path);
    if (!recordDate || !url) continue;
    byUrl.set(url, { title: file.description.trim(), url, recordDate });
  }
  return [...byUrl.values()].sort(
    (a, b) =>
      a.recordDate.localeCompare(b.recordDate) || a.url.localeCompare(b.url),
  );
}

/**
 * Collects `{Description, Prospectus}` objects from the page's Nuxt state.
 * It runs inside the page, so it is a string: a bundled function may carry
 * helpers the page does not have.
 */
export const COLLECT_LISTED_FILES = `(() => {
  const found = [];
  const seen = new Set();
  const stack = [window.__NUXT__];
  while (stack.length > 0) {
    const value = stack.pop();
    if (value === null || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (typeof value.Description === "string" && typeof value.Prospectus === "string") {
      found.push({ description: value.Description, path: value.Prospectus });
    }
    for (const key of Object.keys(value)) stack.push(value[key]);
  }
  return found;
})()`;
