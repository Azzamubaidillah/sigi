import { mkdir, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

import { ORIGIN, SITE_PAGES } from "../e2e/world";

/**
 * Lighthouse accessibility audit of every page of the seeded site, in both
 * languages, in the light and the dark colour scheme, on a desktop and a phone
 * screen. Every run must score at least 90 (PRD §10); the summary lists any
 * that is not 100 with the audits that failed.
 *
 * Plain Node, not the Playwright runner: its TypeScript transform breaks
 * Lighthouse's own modules. Playwright only seeds and serves the site.
 */

const THRESHOLD = 0.9;
const BASE_URL = process.env.BASE_URL ?? ORIGIN;
const DEBUG_PORT = 9341;
const REPORT_DIRECTORY = "lighthouse-report";
/** Audits only the pages whose path contains this, for working on one page. */
const ONLY = process.env.LIGHTHOUSE_ONLY;

const LANGUAGES = ["en", "id"] as const;
const SCHEMES = ["light", "dark"] as const;
const FORM_FACTORS = ["desktop", "mobile"] as const;

type Language = (typeof LANGUAGES)[number];
type Scheme = (typeof SCHEMES)[number];
type FormFactor = (typeof FORM_FACTORS)[number];

interface Failing {
  id: string;
  title: string;
  items: number;
  /** The first few elements that failed: selector, and what is wrong with it. */
  examples: string[];
}

interface Result {
  page: string;
  path: string;
  language: Language;
  scheme: Scheme;
  formFactor: FormFactor;
  score: number | null;
  failing: Failing[];
}

/** The page really is in the language asked for, before it is audited. */
async function assertLanguage(path: string, language: Language): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { cookie: `sigi-lang=${language}` },
  });
  const html = await response.text();
  if (response.status !== 200 || !html.includes(`<html lang="${language}"`))
    throw new Error(
      `${path} is not a 200 page in ${language} (status ${response.status})`,
    );
}

/** What Lighthouse says about the first elements an audit failed on. */
type Audits = NonNullable<
  Awaited<ReturnType<typeof lighthouse>>
>["lhr"]["audits"];

function failingElements(details: Audits[string]["details"]): string[] {
  if (details?.type !== "table") return [];
  return details.items.slice(0, 4).flatMap((item) => {
    const node = item.node;
    if (typeof node !== "object" || node === null) return [];
    const selector = "selector" in node ? String(node.selector) : "";
    const why = "explanation" in node ? String(node.explanation) : "";
    return [`${selector} ${why}`.replace(/\s+/g, " ").trim()];
  });
}

/**
 * One browser per scheme and form factor; inside it every page and language
 * runs one after the other.
 */
async function auditCombination(
  scheme: Scheme,
  formFactor: FormFactor,
  debugPort: number,
): Promise<Result[]> {
  const browser = await chromium.launch({
    args: [
      `--remote-debugging-port=${debugPort}`,
      // Blink's enum lists dark first: 0 is the dark scheme and 1 the light one.
      // The page sees it as prefers-color-scheme whatever the system is set to.
      `--blink-settings=preferredColorScheme=${scheme === "dark" ? 0 : 1}`,
    ],
  });
  const results: Result[] = [];
  try {
    // The scheme really reached the page, before anything is audited.
    // Playwright pins light by default; Lighthouse's own tab is not pinned.
    const probe = await browser.newPage({ colorScheme: null });
    const dark = await probe.evaluate(
      () => matchMedia("(prefers-color-scheme: dark)").matches,
    );
    await probe.close();
    if (dark !== (scheme === "dark"))
      throw new Error(`the ${scheme} scheme was not applied`);

    for (const language of LANGUAGES) {
      for (const { name, path } of SITE_PAGES) {
        if (ONLY && !path.includes(ONLY)) continue;
        await assertLanguage(path, language);
        console.error(`auditing ${path} ${language} ${scheme} ${formFactor}`);
        const run = await lighthouse(`${BASE_URL}${path}`, {
          port: debugPort,
          output: "json",
          logLevel: "error",
          onlyCategories: ["accessibility"],
          formFactor,
          screenEmulation:
            formFactor === "desktop"
              ? { disabled: true }
              : {
                  mobile: true,
                  width: 412,
                  height: 823,
                  deviceScaleFactor: 1.75,
                  disabled: false,
                },
          // Simulated throttling applies no slowdown while loading (only to the
          // performance estimates that this run does not make), and keeps the short
          // settle times below; "provided" would wait 5 s for the CPU to go quiet.
          throttlingMethod: "simulate",
          extraHeaders: { Cookie: `sigi-lang=${language}` },
          // TradingView's embeds are the one thing the site loads from elsewhere.
          blockedUrlPatterns: ["*tradingview.com*", "*tradingview-widget.com*"],
          // The audits read a server-rendered, hydrated DOM: settle briefly, not for the
          // network and CPU quiet periods that exist to measure performance.
          pauseAfterFcpMs: 0,
          pauseAfterLoadMs: 500,
          networkQuietThresholdMs: 500,
          cpuQuietThresholdMs: 500,
          maxWaitForLoad: 30_000,
          disableFullPageScreenshot: true,
        });
        if (!run) throw new Error(`Lighthouse returned nothing for ${path}`);
        const { lhr } = run;
        if (lhr.runtimeError)
          throw new Error(`${path}: ${lhr.runtimeError.message}`);
        const failing = Object.values(lhr.audits)
          .filter(
            (audit) =>
              audit.score !== null &&
              audit.score < 1 &&
              audit.scoreDisplayMode === "binary",
          )
          .map((audit) => ({
            id: audit.id,
            title: audit.title,
            items:
              audit.details?.type === "table" ? audit.details.items.length : 0,
            examples: failingElements(audit.details),
          }));
        results.push({
          page: name,
          path,
          language,
          scheme,
          formFactor,
          score: lhr.categories.accessibility?.score ?? null,
          failing,
        });
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

function summary(results: Result[]): string {
  const points = (result: Result) =>
    result.score === null ? "none" : String(Math.round(result.score * 100));
  const lines = [
    "# Lighthouse accessibility",
    "",
    `Threshold ${THRESHOLD * 100}, target 100. ${results.length} runs: ${SITE_PAGES.length} pages × ${LANGUAGES.length} languages × ${SCHEMES.length} colour schemes × ${FORM_FACTORS.length} screen sizes.`,
    "",
    "| Page | Path | Language | Scheme | Screen | Score | Failing audits |",
    "| --- | --- | --- | --- | --- | ---: | --- |",
    ...results.map(
      (result) =>
        `| ${result.page} | \`${result.path}\` | ${result.language} | ${result.scheme} | ${result.formFactor} | ${points(result)} | ${result.failing.map((f) => `${f.id} (${f.items})`).join(", ")} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

const combinations = SCHEMES.flatMap((scheme) =>
  FORM_FACTORS.map((formFactor) => ({ scheme, formFactor })),
);
// One after another: Lighthouse keeps its timing marks in the process, so two
// audits in one process cannot overlap.
const results: Result[] = [];
for (const { scheme, formFactor } of combinations)
  results.push(...(await auditCombination(scheme, formFactor, DEBUG_PORT)));

const order = (result: Result) =>
  [
    SITE_PAGES.findIndex((page) => page.path === result.path),
    LANGUAGES.indexOf(result.language),
    SCHEMES.indexOf(result.scheme),
    FORM_FACTORS.indexOf(result.formFactor),
  ]
    .map((part) => String(part).padStart(3, "0"))
    .join("");
results.sort((a, b) => order(a).localeCompare(order(b)));

await mkdir(REPORT_DIRECTORY, { recursive: true });
await writeFile(
  `${REPORT_DIRECTORY}/accessibility.json`,
  `${JSON.stringify(results, null, 2)}\n`,
);
await writeFile(`${REPORT_DIRECTORY}/accessibility.md`, summary(results));

for (const result of results) {
  const score = result.score === null ? "none" : Math.round(result.score * 100);
  console.log(
    `lighthouse accessibility ${String(score).padStart(4)}  ${result.path} ${result.language} ${result.scheme} ${result.formFactor}${result.failing.length > 0 ? `  failing: ${result.failing.map((f) => f.id).join(", ")}` : ""}`,
  );
}
const below = results.filter(
  (result) => result.score === null || result.score < THRESHOLD,
);
const lowest = Math.min(...results.map((result) => result.score ?? 0));
console.log(
  `lighthouse accessibility: ${results.length} runs, lowest ${Math.round(lowest * 100)}, ${below.length} below ${THRESHOLD * 100}`,
);
if (below.length > 0) process.exit(1);
