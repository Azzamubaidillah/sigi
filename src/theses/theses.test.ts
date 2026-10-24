import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../config";
import { openDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import { closeReadDatabases } from "../db/read";
import { recommendationLanguage } from "../safety/recommendation";
import type { CompanyMonth } from "../views/snapshot";
import { loadThesis, loadTheses, thesesForTicker } from "../views/theses";
import { checkTheses } from "./check";
import {
  type Condition,
  evaluateCondition,
  parseConditions,
  type Readings,
} from "./conditions";
import { diffLines } from "./diff";
import { parseThesis } from "./folder";
import { parseHeader } from "./header";

const HEADER = `title: Example holder and the float rule
tickers: AAAA, BBBB
stance: The register suggests the controller must sell down by 2027
summary: The float rule forces a placement at AAAA within two years.
status: active
review: 2027-01-31
catalyst: 2027-03-31 First deadline for large caps
catalyst: 2026-12-15 Board meeting`;

const CONDITIONS = `# what would show this wrong
ownership AAAA "PT INDUK AAAA" below 50%
float BBBB below 12.5% from 2026-03-01
macro bi-rate above 6.25
date 2026-11-01 no placement announced by then
price AAAA below 3500`;

function thesisFile(
  header = HEADER,
  conditions: string | null = CONDITIONS,
  body = "## Why\n\nThe controller holds too much.\n",
): string {
  return [
    "```thesis",
    header,
    "```",
    "",
    ...(conditions === null ? [] : ["```conditions", conditions, "```", ""]),
    body,
  ].join("\n");
}

describe("thesis header", () => {
  it("reads every field and sorts the catalysts by date", () => {
    const result = parseHeader(HEADER);
    expect(result.error).toBeNull();
    expect(result.header).toEqual({
      title: "Example holder and the float rule",
      tickers: ["AAAA", "BBBB"],
      stance: "The register suggests the controller must sell down by 2027",
      summary: "The float rule forces a placement at AAAA within two years.",
      status: "active",
      review: "2027-01-31",
      catalysts: [
        { date: "2026-12-15", text: "Board meeting" },
        { date: "2027-03-31", text: "First deadline for large caps" },
      ],
    });
  });

  it("refuses a malformed line with a reason that names it, and never fills a gap", () => {
    const broken = (find: string, replace: string) =>
      parseHeader(HEADER.replace(find, replace)).error;
    expect(broken("tickers: AAAA, BBBB", "tickers: AAAA, bbbb")).toBe(
      'Line 2 of the thesis block: "bbbb" is not an exchange code (four capital letters, separated by commas).',
    );
    expect(broken("status: active", "status: open")).toMatch(
      /^Line 5 .*status is one of active, invalidated, closed/,
    );
    expect(broken("review: 2027-01-31", "review: 2027-02-30")).toMatch(
      /^Line 6 .*review is a date/,
    );
    expect(broken("title:", "headline:")).toMatch(/^Line 1 .*unknown key/);
    expect(parseHeader(`${HEADER}\ntitle: Again`).error).toMatch(
      /^Line 9 .*a second title/,
    );
    expect(parseHeader(HEADER.replace(/^review: .*$/m, "")).error).toBe(
      "The thesis block is missing review.",
    );
  });

  it("refuses a stance that recommends rather than describes", () => {
    expect(
      parseHeader(HEADER.replace(/^stance: .*$/m, "stance: Buy below 3,000"))
        .error,
    ).toBe(
      'Line 3 of the thesis block: stance describes a view and may not recommend; "Buy" reads as a recommendation.',
    );
  });
});

describe("recommendation language", () => {
  it("catches ratings, targets and instructions, but not the verbs inside a description", () => {
    expect(recommendationLanguage("Strong BUY")).toBe("Strong BUY");
    expect(recommendationLanguage("Saham ini layak dibeli")).toBe(
      "layak dibeli",
    );
    expect(recommendationLanguage("a price  target of 5,000")).toBe(
      "price  target",
    );
    expect(recommendationLanguage("Cheap. Buy below 3,000")).toBe("Buy");
    expect(recommendationLanguage("- jual jika di bawah 3.000")).toBe("jual");
    expect(
      recommendationLanguage(
        "The controller must sell down, while funds hold the rest",
      ),
    ).toBeNull();
    expect(
      recommendationLanguage("Holders, buybacks and shareholding changes"),
    ).toBeNull();
  });
});

describe("thesis conditions", () => {
  it("reads each condition type", () => {
    const result = parseConditions(CONDITIONS);
    expect(result.error).toBeNull();
    expect(result.conditions).toEqual([
      {
        kind: "ownership",
        text: 'ownership AAAA "PT INDUK AAAA" below 50%',
        shareCode: "AAAA",
        holder: "PT INDUK AAAA",
        direction: "below",
        hundredths: 5_000,
      },
      {
        kind: "float",
        text: "float BBBB below 12.5% from 2026-03-01",
        shareCode: "BBBB",
        hundredths: 1_250,
        from: "2026-03-01",
      },
      {
        kind: "macro",
        text: "macro bi-rate above 6.25",
        seriesId: "bi-rate",
        direction: "above",
        value: 6.25,
      },
      {
        kind: "date",
        text: "date 2026-11-01 no placement announced by then",
        date: "2026-11-01",
        note: "no placement announced by then",
      },
      {
        kind: "price",
        text: "price AAAA below 3500",
        shareCode: "AAAA",
        direction: "below",
        level: "3500",
      },
    ]);
  });

  it("makes the whole block unreadable on one bad line, saying which and why", () => {
    const error = (text: string) => parseConditions(text).error;
    expect(error("macro bi-rate above 6.25\nfloat BBBB above 20%")).toMatch(
      /^Line 2 of the conditions block: float takes only below/,
    );
    expect(error("macro bi-rates above 6")).toMatch(
      /^Line 1 .*unknown series "bi-rates"; the series are bi-rate, /,
    );
    expect(error('ownership AAAA "X" below 150%')).toMatch(
      /"150%" is not a percentage/,
    );
    expect(error("macro jisdor above 17,000")).toMatch(/not a plain number/);
    expect(error("revenue AAAA below 10")).toMatch(
      /unknown condition "revenue"/,
    );
    expect(error("date 2027-06-30 x\ndate  2027-06-30   x")).toMatch(
      /^Line 2 .*the same condition twice/,
    );
    expect(error("# nothing but a comment")).toBe(
      "The conditions block has no condition.",
    );
  });
});

describe("thesis file", () => {
  it("shows the header and body when the conditions block is missing, with the reason", () => {
    const thesis = parseThesis(thesisFile(HEADER, null));
    expect(thesis.header?.title).toBe("Example holder and the float rule");
    expect(thesis.conditions).toBeNull();
    expect(thesis.conditionsError).toBe("The file has no conditions block.");
  });

  it("keeps the data blocks out of the body", () => {
    const thesis = parseThesis(
      thesisFile(HEADER, CONDITIONS, "## Why\n\n```conditions\nliteral\n```\n"),
    );
    expect(thesis.blocks.map((block) => block.type)).toEqual([
      "heading",
      "code",
    ]);
  });

  it("requires a written post-mortem to close a thesis", () => {
    const closed = HEADER.replace("status: active", "status: closed");
    expect(parseThesis(thesisFile(closed)).headerError).toBe(
      'A closed thesis needs a "## Post-mortem" section with text (PRD F7).',
    );
    expect(
      parseThesis(thesisFile(closed, CONDITIONS, "## Post-mortem\n\n## Why\n"))
        .header,
    ).toBeNull();
    const written = parseThesis(
      thesisFile(
        closed,
        CONDITIONS,
        "## Post-mortem\n\nThe placement came early.\n",
      ),
    );
    expect(written.headerError).toBeNull();
    expect(written.header?.status).toBe("closed");
  });

  it("turns raw HTML into text and drops unsafe links", () => {
    const thesis = parseThesis(
      thesisFile(
        HEADER,
        CONDITIONS,
        "<script>alert(1)</script>\n\n[x](javascript:alert(1)) [y](/t/AAAA) [z](../other/2026-10-01.md)\n",
      ),
    );
    expect(thesis.blocks[0]).toEqual({
      type: "paragraph",
      children: [{ type: "text", text: "<script>alert(1)</script>" }],
    });
    expect(thesis.blocks[1]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", text: "x " },
        {
          type: "link",
          href: "/t/AAAA",
          children: [{ type: "text", text: "y" }],
        },
        { type: "text", text: " " },
        {
          type: "link",
          href: "/theses/other?version=2026-10-01",
          children: [{ type: "text", text: "z" }],
        },
      ],
    });
  });
});

function company(
  shareCode: string,
  rows: [string, string | null, number][],
): CompanyMonth {
  return {
    shareCode,
    issuerName: `${shareCode} Tbk`,
    holdings: rows.map(
      ([investorName, investorType, percentHundredths], i) => ({
        rowNumber: i + 1,
        investorName,
        investorType,
        localForeign: "L",
        sharesScripless: percentHundredths,
        sharesScrip: 0,
        sharesTotal: percentHundredths,
        percentHundredths,
        nationality: null,
        domicile: "INDONESIA",
      }),
    ),
  };
}

function readings(overrides: Partial<Readings> = {}): Readings {
  return {
    today: "2026-10-25",
    ownership: {
      recordDate: "2026-09-30",
      companies: new Map([
        [
          "AAAA",
          company("AAAA", [
            ["PT INDUK AAAA", "Corporate", 5_600],
            ["BUDI CONTOH", "Individual", 300],
          ]),
        ],
        // 86% at or above 5%: bound 14%.
        ["BBBB", company("BBBB", [["PT INDUK BBBB", "Corporate", 8_600]])],
        // 8% listed above 1%: register incomplete.
        ["CCCC", company("CCCC", [["PT KECIL", "Corporate", 800]])],
      ]),
      knownHolders: new Set([
        "PT INDUK AAAA",
        "BUDI CONTOH",
        "PT INDUK BBBB",
        "PT KECIL",
        "PT LAIN",
      ]),
      institutions: new Set([
        "PT INDUK AAAA",
        "PT INDUK BBBB",
        "PT KECIL",
        "PT LAIN",
      ]),
    },
    macro: new Map([["bi-rate", { period: "2026-09", value: 4.75 }]]),
    ...overrides,
  };
}

function check(line: string, at: Readings = readings()) {
  const parsed = parseConditions(line);
  if (!parsed.conditions) throw new Error(parsed.error);
  return evaluateCondition(parsed.conditions[0] as Condition, at);
}

describe("condition evaluation", () => {
  it("compares a named institution's position, treating an unlisted one as under 1%", () => {
    expect(check('ownership AAAA "PT INDUK AAAA" below 60%')).toEqual({
      status: "met",
      detail: "Holds 56.00% of AAAA on 2026-09-30 (condition: below 60.00%).",
      source: "S1",
    });
    expect(check('ownership AAAA "pt. induk aaaa" above 60%').status).toBe(
      "not-met",
    );
    expect(check('ownership AAAA "PT LAIN" below 5%').status).toBe("met");
    expect(check('ownership AAAA "PT LAIN" above 5%').status).toBe("not-met");
    expect(check('ownership AAAA "PT LAIN" below 1%').status).toBe("unknown");
  });

  it("says unknown, with the reason, rather than guess", () => {
    expect(check('ownership AAAA "BUDI CONTOH" below 5%').detail).toMatch(
      /institutional holders only/,
    );
    expect(check('ownership AAAA "PT INDUK AAAAA" below 5%').detail).toMatch(
      /in no published month; check the spelling/,
    );
    expect(check('ownership DDDD "PT LAIN" below 5%').detail).toBe(
      "DDDD is not in the 2026-09-30 register.",
    );
    expect(check("float CCCC below 15%").detail).toMatch(/D-019/);
    expect(
      check("float BBBB below 15%", readings({ ownership: null })).detail,
    ).toBe("No ownership month is published yet.");
    expect(check("macro cpi-yoy above 3").detail).toBe(
      "Inflation, year on year has no published value yet.",
    );
  });

  it("shows a float below a level only when the upper bound is", () => {
    expect(check("float BBBB below 15%").status).toBe("met");
    expect(check("float BBBB below 12.5%")).toEqual({
      status: "not-met",
      detail:
        "The register's upper bound is 14.00% on 2026-09-30; the official figure can be lower, so this cannot show it below 12.50%.",
      source: "S1",
    });
    expect(check("float BBBB below 15% from 2026-10-31").detail).toBe(
      "Checked from 2026-10-31; the latest register is dated 2026-09-30.",
    );
  });

  it("compares the latest published macro value, turns a date on the day it names, and leaves prices to a person", () => {
    expect(check("macro bi-rate below 5")).toEqual({
      status: "met",
      detail:
        "BI-Rate is 4.75 (%) for 2026-09, as published (condition: below 5).",
      source: "S6",
    });
    expect(check("macro bi-rate above 6.25").status).toBe("not-met");
    expect(check("date 2026-10-26 x").detail).toBe("1 day to 2026-10-26.");
    expect(check("date 2026-10-25 x").status).toBe("met");
    expect(check("price AAAA below 3500").status).toBe("manual");
  });
});

describe("thesis diff", () => {
  it("lists removed and added lines with context, and nothing for identical text", () => {
    const before = "a\nb\nc\nd\ne\nf\ng\nh\n";
    const after = "a\nb\nc\nD\ne\nf\ng\nh\ni\n";
    const result = diffLines(before, after);
    if (result.kind !== "diff") throw new Error(result.kind);
    expect(result.added).toBe(2);
    expect(result.removed).toBe(1);
    expect(result.hunks).toHaveLength(1);
    expect(
      result.hunks[0]!.lines.map((line) =>
        line.kind === "same"
          ? ` ${line.text}`
          : line.kind === "added"
            ? `+${line.text}`
            : `-${line.text}`,
      ),
    ).toEqual([" a", " b", " c", "-d", "+D", " e", " f", " g", " h", "+i"]);
    const same = diffLines(before, before);
    expect(same.kind === "diff" && same.hunks).toEqual([]);
  });
});

// ---- The worker's check and the pages' view, end to end -----------------------

const directories: string[] = [];
afterEach(() => {
  closeReadDatabases();
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function site() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sigi-theses-"));
  directories.push(root);
  const config = loadConfig({ NODE_ENV: "test", SIGI_DATA_DIR: root }, root);
  const { databasePath, thesesDirectory } = config;
  const { sqlite, db } = openDatabase(databasePath);
  migrateDatabase(db);
  publishOwnership(sqlite);
  publishMacro(sqlite, 6.5);
  const write = (slug: string, version: string, text: string) => {
    fs.mkdirSync(path.join(thesesDirectory, slug), { recursive: true });
    fs.writeFileSync(path.join(thesesDirectory, slug, `${version}.md`), text);
  };
  const run = (day: string) =>
    checkTheses(sqlite, {
      databasePath,
      thesesDirectory,
      now: Date.parse(`${day}T03:00:00Z`),
    });
  return { sqlite, config, write, run };
}

function publishOwnership(sqlite: Database.Database): void {
  const sha = "a".repeat(64);
  sqlite
    .prepare(
      `INSERT INTO source_files VALUES (?, 'S1', 'f.xlsx', 1, 'f.xlsx', 'https://example.test/', '2026-10-01', 0)`,
    )
    .run(sha);
  const run = Number(
    sqlite
      .prepare(
        `INSERT INTO import_runs (source_id, file_sha256, parser_version, started_at, finished_at,
           outcome, record_date, row_count, issuer_count, holder_count, content_hash, correction)
         VALUES ('S1', ?, 'test', 0, 0, 'published', '2026-09-30', 2, 2, 2, 'x', 0)`,
      )
      .run(sha).lastInsertRowid,
  );
  sqlite
    .prepare(
      `INSERT INTO ownership_months VALUES ('2026-09-30', ?, 0, 'x', 2, 0, 0)`,
    )
    .run(run);
  const insert = sqlite.prepare(
    `INSERT INTO ownership_holdings VALUES ('2026-09-30', ?, ?, ?, ?, 'Corporate', 'L', NULL, 'INDONESIA', ?, 0, ?, ?)`,
  );
  insert.run(1, "AAAA", "AAAA Tbk", "PT INDUK AAAA", 5_600, 5_600, 5_600);
  insert.run(2, "BBBB", "BBBB Tbk", "PT INDUK BBBB", 8_600, 8_600, 8_600);
}

function publishMacro(sqlite: Database.Database, biRate: number): void {
  const sha = "b".repeat(64);
  sqlite
    .prepare(
      `INSERT INTO source_files VALUES (?, 'S6', 'r.xlsx', 1, 'r.xlsx', 'https://example.test/', '2026-10-01', 0)`,
    )
    .run(sha);
  const run = Number(
    sqlite
      .prepare(
        `INSERT INTO import_runs (source_id, file_sha256, parser_version, started_at, finished_at,
           outcome, record_date, row_count, issuer_count, holder_count, content_hash, correction)
         VALUES ('S6', ?, 'test', 0, 0, 'published', NULL, 1, 0, 0, 'y', 0)`,
      )
      .run(sha).lastInsertRowid,
  );
  sqlite
    .prepare(
      `INSERT INTO macro_series VALUES ('bi-rate', ?, 0, 'y', 1, '2026-09', 0)`,
    )
    .run(run);
  sqlite
    .prepare(`INSERT INTO macro_observations VALUES ('bi-rate', '2026-09', ?)`)
    .run(biRate);
}

describe("daily check and the theses pages", () => {
  it("records each day's check, lists met conditions of active theses with the day they were first met, and names an unreadable block", () => {
    const { sqlite, config, write, run } = site();
    write("float-rule", "2026-10-20", thesisFile());
    write(
      "broken",
      "2026-10-21",
      thesisFile(HEADER.replace("AAAA, BBBB", "CCCC"), "float CCCC above 20%"),
    );

    expect(run("2026-10-24")).toEqual({
      checkedOn: "2026-10-24",
      theses: 2,
      conditions: 5,
      met: 1,
      unreadable: ["broken"],
    });
    run("2026-10-25");
    run("2026-10-25");
    const rows = sqlite
      .prepare("SELECT COUNT(*) AS n FROM thesis_checks")
      .get() as { n: number };
    expect(rows.n).toBe(10);

    const index = loadTheses(config);
    expect(index.lastCheckedOn).toBe("2026-10-25");
    expect(index.hits).toEqual([
      {
        slug: "float-rule",
        title: "Example holder and the float rule",
        condition: expect.objectContaining({
          text: "macro bi-rate above 6.25",
        }),
        detail:
          "BI-Rate is 6.50 (%) for 2026-09, as published (condition: above 6.25).",
        metSince: "2026-10-24",
      },
    ]);
    const broken = index.theses.find((thesis) => thesis.slug === "broken");
    expect(broken?.conditions).toBeNull();
    expect(broken?.conditionsError).toMatch(
      /^Line 1 of the conditions block: float takes only below/,
    );

    // The date condition turns on the day it names.
    run("2026-11-01");
    const dated = loadTheses(config).hits.map((hit) => [
      hit.condition.text,
      hit.metSince,
    ]);
    expect(dated).toEqual([
      ["date 2026-11-01 no placement announced by then", "2026-11-01"],
      ["macro bi-rate above 6.25", "2026-10-24"],
    ]);
    expect(thesesForTicker(config, "BBBB").map((t) => t.slug)).toEqual([
      "float-rule",
    ]);
  });

  it("keeps every version, checks only the current one, and shows what changed", () => {
    const { config, write, run } = site();
    write("float-rule", "2026-10-20", thesisFile());
    write(
      "float-rule",
      "2026-10-22",
      thesisFile(HEADER.replace("review: 2027-01-31", "review: 2027-02-28")),
    );
    fs.writeFileSync(
      path.join(config.thesesDirectory, "float-rule", "notes.md"),
      "not a version",
    );
    run("2026-10-24");

    const current = loadThesis(config, "float-rule", null)!;
    expect(current.current).toBe(true);
    expect(current.summary.versions).toEqual(["2026-10-22", "2026-10-20"]);
    expect(current.summary.conditions?.every((row) => row.check !== null)).toBe(
      true,
    );
    expect(current.previous).toBe("2026-10-20");
    expect(current.diff).toMatchObject({ kind: "diff", added: 1, removed: 1 });

    const older = loadThesis(config, "float-rule", "2026-10-20")!;
    expect(older.current).toBe(false);
    expect(older.summary.conditions?.every((row) => row.check === null)).toBe(
      true,
    );
    expect(older.diff).toBeNull();

    expect(loadThesis(config, "float-rule", "2026-10-21")).toBeNull();
    expect(loadThesis(config, "../float-rule", null)).toBeNull();
  });
});
