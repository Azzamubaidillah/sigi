import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildS1Workbook, type FixtureRow, syntheticMonth } from "./s1-fixture";
import { excelSerialDate, parseS1Xlsx } from "./s1-xlsx";

const rows: FixtureRow[] = [
  {
    shareCode: "AAAA",
    issuerName: "CONTOH SATU Tbk",
    investorName: "PT INDUK CONTOH",
    investorType: "CP",
    localForeign: "L         ",
    domicile: "INDONESIA",
    scripless: 3_200_142_830,
    scrip: 0,
    percentHundredths: 4110,
  },
  {
    shareCode: "AAAA",
    issuerName: "CONTOH SATU Tbk",
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
    percentHundredths: 115,
  },
];

describe("S1 workbook parser", () => {
  it("reads every row, trimming padding and normalising foreign to F", () => {
    const result = parseS1Xlsx(
      buildS1Workbook(rows, {
        recordDate: "2026-02-27",
        typeHeader: "INVESTOR_TYPE",
      }),
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.recordDate).toBe("2026-02-27");
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
        investorType: null,
        localForeign: null,
        domicile: null,
      }),
      // 1.15 is stored by Excel as 1.1499999999999999.
      expect.objectContaining({
        localForeign: "F",
        percentHundredths: 115,
        sharesTotal: 21_487_162_037,
      }),
    ]);
  });

  it("reads the ticker TRUE that Excel stored as a boolean, and an empty scrip cell as zero", () => {
    const result = parseS1Xlsx(
      buildS1Workbook(
        [
          { ...rows[0], shareCode: "TRUE", scrip: null },
          { ...rows[0], investorName: "PT LAIN", total: undefined },
        ],
        { recordDate: "2026-04-30" },
      ),
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.rows[0]).toMatchObject({
      shareCode: "TRUE",
      sharesScrip: 0,
      sharesTotal: result.rows[0].sharesScripless,
    });
  });

  it("accepts the classification header used since April 2026", () => {
    const result = parseS1Xlsx(
      buildS1Workbook([{ ...rows[0], investorType: "Corporate" }], {
        recordDate: "2026-09-30",
        typeHeader: "INVESTOR_CLASSIFICATION",
      }),
    );
    expect(result.ok && result.rows[0].investorType).toBe("Corporate");
  });

  it("refuses a changed layout, a second date, and malformed numbers", () => {
    expect(
      parseS1Xlsx(
        buildS1Workbook(rows, {
          recordDate: "2026-02-27",
          extraHeader: "NOTE",
        }),
      ).ok,
    ).toBe(false);
    expect(
      parseS1Xlsx(
        buildS1Workbook([rows[0], { ...rows[2], date: "2026-03-31" }], {
          recordDate: "2026-02-27",
        }),
      ),
    ).toEqual({
      ok: false,
      error: "row 8: record date 2026-03-31 differs from 2026-02-27",
    });
    expect(
      parseS1Xlsx(
        buildS1Workbook([{ ...rows[0], percentText: "41,10" }], {
          recordDate: "2026-02-27",
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'row 7: percentage "41,10" is not a number from 0 to 100',
    });
  });

  it("rounds a full-precision percentage to hundredths", () => {
    const result = parseS1Xlsx(
      buildS1Workbook([{ ...rows[0], percentText: "36.108405090747539" }], {
        recordDate: "2026-04-30",
      }),
    );
    expect(result.ok && result.rows[0].percentHundredths).toBe(3611);
  });

  it("skips leftover formulas below the last holder", () => {
    const result = parseS1Xlsx(
      buildS1Workbook(rows, { recordDate: "2026-04-30", residueBelow: 3 }),
    );
    expect(result.ok && result.rows).toHaveLength(rows.length);
  });

  it("refuses something that is not a workbook", () => {
    expect(
      parseS1Xlsx(new TextEncoder().encode("<html>Just a moment...</html>")).ok,
    ).toBe(false);
  });

  it("parses a month at the real file's scale", () => {
    const month = syntheticMonth(955);
    const result = parseS1Xlsx(
      buildS1Workbook(month, { recordDate: "2026-09-30" }),
    );
    expect(result.ok && result.rows.length).toBe(month.length);
  });

  it("converts Excel serial dates", () => {
    expect(excelSerialDate("46080")).toBe("2026-02-27");
    expect(excelSerialDate("46295")).toBe("2026-09-30");
    expect(excelSerialDate("27-Feb-2026")).toBeNull();
  });
});

/**
 * The published workbooks, when local copies exist. They are not in the
 * repository (they name individuals); point SIGI_S1_REAL_DIR at a directory
 * holding one-YYYY-MM-DD.xlsx files.
 */
const realDir = process.env.SIGI_S1_REAL_DIR;
describe.runIf(realDir && fs.existsSync(realDir))(
  "S1 workbook parser, real files",
  () => {
    it("reads the 2026-02-27 workbook with the same counts as the PDF edition", () => {
      const result = parseS1Xlsx(
        new Uint8Array(
          fs.readFileSync(path.join(realDir!, "one-2026-02-27.xlsx")),
        ),
      );
      if (!result.ok) throw new Error(result.error);
      expect(result.rows).toHaveLength(7_257);
      expect(new Set(result.rows.map((row) => row.shareCode)).size).toBe(955);
      expect(new Set(result.rows.map((row) => row.investorName)).size).toBe(
        5_199,
      );
    });
  },
);
