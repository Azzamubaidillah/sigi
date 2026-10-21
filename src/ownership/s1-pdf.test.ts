import fs from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildS1FixturePdf,
  type FixtureRow,
  syntheticMonth,
} from "./s1-fixture";
import { parseRecordDate, parseS1Pdf } from "./s1-pdf";

const rows: FixtureRow[] = [
  {
    shareCode: "AAAA",
    issuerName: "CONTOH SATU Tbk",
    investorName: "PT INDUK CONTOH",
    investorType: "CP",
    localForeign: "L",
    domicile: "INDONESIA",
    scripless: 3_200_142_830,
    scrip: 0,
    percentHundredths: 4110,
  },
  {
    shareCode: "AAAA",
    issuerName: "CONTOH SATU Tbk",
    investorName: "WAYAN CONTOH",
    investorNameTail: "SE",
    investorType: "ID",
    localForeign: "L",
    nationality: "INDONESIAN",
    domicile: "INDONESIA",
    scripless: 454_011_607,
    scrip: 0,
    percentHundredths: 583,
  },
  {
    shareCode: "BBBB",
    issuerName: "CONTOH DUA Tbk",
    investorName: "YAYASAN CONTOH",
    scripless: 0,
    scrip: 111_372_886,
    percentHundredths: 283,
  },
  {
    shareCode: "BBBB",
    issuerName: "CONTOH DUA Tbk",
    investorName: "CONTOH FUND LTD",
    investorType: "IB",
    localForeign: "A",
    domicile: "VIRGIN ISLANDS, BRITISH",
    scripless: 21_239_760_958,
    scrip: 247_401_079,
    percentHundredths: 8685,
  },
];

describe("S1 parser", () => {
  it("reads every cell into its column, across pages", async () => {
    const result = await parseS1Pdf(
      buildS1FixturePdf(rows, { recordDate: "27-Feb-2026", rowsPerPage: 3 }),
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.recordDate).toBe("2026-02-27");
    expect(result.pages).toBe(3);
    expect(result.rows).toEqual([
      {
        rowNumber: 1,
        recordDate: "2026-02-27",
        shareCode: "AAAA",
        issuerName: "CONTOH SATU Tbk",
        investorName: "PT INDUK CONTOH",
        investorType: "CP",
        localForeign: "L",
        nationality: null,
        domicile: "INDONESIA",
        sharesScripless: 3_200_142_830,
        sharesScrip: 0,
        sharesTotal: 3_200_142_830,
        percentHundredths: 4110,
      },
      expect.objectContaining({
        rowNumber: 2,
        // Two runs in one marked-content sequence are one name.
        investorName: "WAYAN CONTOH SE",
        nationality: "INDONESIAN",
      }),
      // Unclassified scrip: type, local/foreign and domicile are all empty.
      expect.objectContaining({
        rowNumber: 3,
        investorName: "YAYASAN CONTOH",
        investorType: null,
        localForeign: null,
        nationality: null,
        domicile: null,
        sharesScrip: 111_372_886,
      }),
      expect.objectContaining({
        rowNumber: 4,
        shareCode: "BBBB",
        localForeign: "A",
        domicile: "VIRGIN ISLANDS, BRITISH",
        sharesTotal: 21_487_162_037,
        percentHundredths: 8685,
      }),
    ]);
  });

  it("refuses a truncated file", async () => {
    const bytes = buildS1FixturePdf(rows, { recordDate: "27-Feb-2026" });
    const result = await parseS1Pdf(
      bytes.slice(0, Math.floor(bytes.length / 2)),
    );
    expect(result.ok).toBe(false);
  });

  it("refuses rows on a page that lost its header", async () => {
    const result = await parseS1Pdf(
      buildS1FixturePdf(rows, {
        recordDate: "27-Feb-2026",
        rowsPerPage: 2,
        omitHeaderOnPage: 2,
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "page 3: row data without the column header",
    });
  });

  it("refuses a cell it cannot place in a column", async () => {
    const result = await parseS1Pdf(
      buildS1FixturePdf(rows, { recordDate: "27-Feb-2026", strayCellOnRow: 1 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/page 2, row 2: .*STRAY/);
  });

  it("refuses a file with two record dates", async () => {
    const mixed = rows.map((row, index) =>
      index === 3 ? { ...row, date: "31-Mar-2026" } : row,
    );
    const result = await parseS1Pdf(
      buildS1FixturePdf(mixed, { recordDate: "27-Feb-2026" }),
    );
    expect(result).toEqual({
      ok: false,
      error: "page 2, row 4: record date 2026-03-31 differs from 2026-02-27",
    });
  });

  it("refuses a malformed number rather than guessing", async () => {
    const result = await parseS1Pdf(
      buildS1FixturePdf([{ ...rows[0], percentText: "41.10" }], {
        recordDate: "27-Feb-2026",
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: 'page 2, row 1: percentage "41.10" is not NN,NN',
    });
  });

  it(
    "parses a full synthetic month at the real file's scale",
    { timeout: 30_000 },
    async () => {
      const month = syntheticMonth(955);
      const result = await parseS1Pdf(
        buildS1FixturePdf(month, { recordDate: "30-Sep-2026" }),
      );
      if (!result.ok) throw new Error(result.error);
      expect(result.rows).toHaveLength(month.length);
      expect(new Set(result.rows.map((row) => row.shareCode)).size).toBe(955);
    },
  );
});

describe("record date", () => {
  it("reads DD-Mon-YYYY and refuses impossible dates", () => {
    expect(parseRecordDate("27-Feb-2026")).toBe("2026-02-27");
    expect(parseRecordDate("30-Feb-2026")).toBeNull();
    expect(parseRecordDate("27-FEB-2026")).toBeNull();
  });
});

/**
 * The published file itself, when a local copy is available. It is not in the
 * repository (it names individuals); point SIGI_S1_REAL_PDF at a copy of the
 * 2026-02-27 file to run this. Counts checked against an independent
 * extraction, whose own investor count (5,226) is inflated by 59 rows it
 * garbled where a long issuer name overflows into the next column.
 */
const realFile = process.env.SIGI_S1_REAL_PDF;
describe.runIf(realFile && fs.existsSync(realFile))(
  "S1 parser, real file",
  () => {
    it("reproduces the 2026-02-27 file's counts", async () => {
      const result = await parseS1Pdf(
        new Uint8Array(fs.readFileSync(realFile!)),
      );
      if (!result.ok) throw new Error(result.error);
      expect(result.recordDate).toBe("2026-02-27");
      expect(result.rows).toHaveLength(7_257);
      expect(new Set(result.rows.map((row) => row.shareCode)).size).toBe(955);
      expect(new Set(result.rows.map((row) => row.investorName)).size).toBe(
        5_199,
      );
    }, 60_000);
  },
);
