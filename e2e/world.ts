import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The world the end-to-end suite and the Lighthouse run share: where the
 * seeded site lives, which port serves it, and the synthetic records in it.
 * `seed.ts` writes this world; the specs assert it. Everything is invented:
 * no real file and no real person is used.
 */

export const PORT = 3231;
export const ORIGIN = `http://127.0.0.1:${PORT}`;

/** The seeded data directory; `seed.ts` recreates it from nothing on every run. */
export const DATA_DIR =
  process.env.SIGI_E2E_DIR ?? path.join(os.tmpdir(), "sigi-e2e");
export const THESES_DIR = path.join(DATA_DIR, "theses");
const MANIFEST = path.join(DATA_DIR, "manifest.json");

/**
 * A second site on its own port with a migrated database and nothing in it:
 * no month, no series, no thesis, no brief. It shows every "nothing yet" state.
 */
export const EMPTY_PORT = 3232;
export const EMPTY_ORIGIN = `http://127.0.0.1:${EMPTY_PORT}`;
export const EMPTY_DIR = `${DATA_DIR}-empty`;

/** The two published S1 months. */
export const MONTHS = { previous: "2026-08-31", latest: "2026-09-30" } as const;

export const COMPANIES = {
  /** A 60% controller; an institution that grows its stake; an individual. */
  steady: { code: "AAAA", issuer: "Aldebaran Contoh Tbk" },
  /** A controller above 80% who sells down: its bound rises past 15%. */
  sellingDown: { code: "BBBB", issuer: "Bintang Contoh Tbk" },
  /** Holders above 1% total 8%: the register is incomplete, so no float figure. */
  incomplete: { code: "CCCC", issuer: "Citra Contoh Tbk" },
  /** A 90% controller: certainly below the 15% minimum in its first month. */
  belowMinimum: { code: "DDDD", issuer: "Dharma Contoh Tbk" },
} as const;

/** A well-formed share code the register has never seen. */
export const UNKNOWN_CODE = "ZZZZ";

export const HOLDERS = {
  /** An institution that appears at three companies. */
  fund: { name: "DANA PENSIUN CONTOH", slug: "dana-pensiun-contoh" },
  parent: { name: "PT INDUK AAAA", slug: "pt-induk-aaaa" },
  /** Published as an individual: it has no page. */
  individual: { name: "BUDI CONTOH", slug: "budi-contoh" },
} as const;

export const THESES = {
  /** Valid, two versions, conditions that the worker has checked. */
  valid: {
    slug: "float-rule-aaaa",
    title: "Aldebaran and the float rule",
    versions: ["2026-10-20", "2026-09-15"],
  },
  /** A conditions block with a bad line: shown as "Conditions unreadable". */
  unreadable: { slug: "broken-conditions", title: "Citra with a bad block" },
} as const;

/** The macro series the seed leaves absent, with the reason each shows. */
export const MACRO_ABSENT = {
  notFetched: "Foreign-exchange reserves",
  fetchFailed: "US federal funds target, upper bound",
  rejected: "US Treasury yield, 10 years",
} as const;

/** What `seed.ts` decides at run time (the brief follows today's date). */
export interface Manifest {
  brief: { date: string; rejectedFile: string; rejectedReason: string };
}

export function manifest(): Manifest {
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as Manifest;
}

export function writeManifest(value: Manifest): void {
  fs.writeFileSync(MANIFEST, `${JSON.stringify(value, null, 2)}\n`);
}

export interface SitePage {
  /** What it is, for reports. */
  name: string;
  path: string;
  /** English `<title>` without the " · Sigi" suffix, when stable. */
  heading?: string;
}

/** Every page of the seeded site that answers 200, in navigation order. */
export const SITE_PAGES: readonly SitePage[] = [
  { name: "market", path: "/" },
  { name: "ticker", path: `/t/${COMPANIES.steady.code}` },
  {
    name: "ticker, register incomplete",
    path: `/t/${COMPANIES.incomplete.code}`,
  },
  { name: "ticker, not in the register", path: `/t/${UNKNOWN_CODE}` },
  { name: "brief", path: "/brief" },
  { name: "investability", path: "/investability" },
  { name: "holders", path: "/holders" },
  { name: "holder", path: `/holders/${HOLDERS.fund.slug}` },
  { name: "macro", path: "/macro" },
  { name: "theses", path: "/theses" },
  { name: "thesis", path: `/theses/${THESES.valid.slug}` },
  {
    name: "thesis, older version",
    path: `/theses/${THESES.valid.slug}?version=${THESES.valid.versions[1]}`,
  },
  {
    name: "thesis, conditions unreadable",
    path: `/theses/${THESES.unreadable.slug}`,
  },
  { name: "data", path: "/data" },
  { name: "privacy", path: "/privacy" },
];
