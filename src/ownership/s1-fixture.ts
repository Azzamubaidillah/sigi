import { strToU8, zipSync } from "fflate";

/**
 * Builds a synthetic workbook in the layout of the exchange's >1% holders
 * file, for tests and the CI rebuild check. The real files are not committed:
 * they name individuals (DATA-SOURCES S1).
 *
 * It reproduces what the parser depends on: disclaimer rows above a header
 * row, Excel serial dates, numbers stored as numbers (percentages with binary
 * noise such as 1.1499999999999999), padded local/foreign codes, empty cells
 * for unclassified holders, and either header variant for column E.
 */

export interface FixtureRow {
  shareCode: string;
  issuerName: string;
  investorName: string;
  investorType?: string;
  localForeign?: string;
  nationality?: string;
  domicile?: string;
  scripless: number;
  /** Null leaves the cell empty, as one row of the April 2026 file does. */
  scrip: number | null;
  /** Defaults to scripless + scrip. */
  total?: number;
  percentHundredths: number;
  /** Written instead of the percentage, to model a malformed cell. */
  percentText?: string;
  /** Overrides the record date (YYYY-MM-DD) on this row only. */
  date?: string;
}

export interface FixtureOptions {
  /** YYYY-MM-DD */
  recordDate: string;
  /** Column E's header; the exchange switched in April 2026. */
  typeHeader?: "INVESTOR_TYPE" | "INVESTOR_CLASSIFICATION";
  /** A thirteenth header, to model a layout change. */
  extraHeader?: string;
  /**
   * Rows below the last holder with only a #DIV/0! formula in column O, as
   * the April 2026 file has.
   */
  residueBelow?: number;
}

function serial(isoDate: string): number {
  return Math.round(
    (Date.parse(`${isoDate}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000,
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const COLUMNS = "ABCDEFGHIJKLM";

function cellXml(
  column: number,
  row: number,
  value: string | number | null | undefined,
): string {
  const ref = `${COLUMNS[column - 1]}${row}`;
  if (value === undefined || value === null) return `<c r="${ref}" s="1"/>`;
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  // Excel turns a typed TRUE into a boolean, and the real files carry the
  // ticker TRUE that way.
  if (value === "TRUE") return `<c r="${ref}" t="b"><v>1</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

export function buildS1Workbook(
  rows: readonly FixtureRow[],
  options: FixtureOptions,
): Uint8Array {
  const header = [
    "DATE",
    "SHARE_CODE",
    "ISSUER_NAME",
    "INVESTOR_NAME",
    options.typeHeader ?? "INVESTOR_CLASSIFICATION",
    "LOCAL_FOREIGN",
    "NATIONALITY",
    "DOMICILE",
    "HOLDINGS_SCRIPLESS",
    "HOLDINGS_SCRIP",
    "TOTAL_HOLDING_SHARES",
    "PERCENTAGE",
    ...(options.extraHeader ? [options.extraHeader] : []),
  ];
  const sheetRows = [
    `<row r="1">${cellXml(1, 1, "*Penafian: synthetic fixture")}</row>`,
    `<row r="3">${cellXml(1, 3, "*Disclaimer: synthetic fixture")}</row>`,
    `<row r="6">${header.map((label, i) => cellXml(i + 1, 6, label)).join("")}</row>`,
    ...rows.map((row, index) => {
      const r = index + 7;
      const values: (string | number | null | undefined)[] = [
        serial(row.date ?? options.recordDate),
        row.shareCode,
        row.issuerName,
        row.investorName,
        row.investorType,
        row.localForeign,
        row.nationality,
        row.domicile,
        row.scripless,
        row.scrip,
        row.total ?? row.scripless + (row.scrip ?? 0),
        // Excel's binary form of a two-decimal number, as the real files carry.
        row.percentText ?? row.percentHundredths / 100,
      ];
      return `<row r="${r}">${values.map((value, i) => cellXml(i + 1, r, value)).join("")}</row>`;
    }),
    ...Array.from({ length: options.residueBelow ?? 0 }, (_, index) => {
      const r = rows.length + 7 + index;
      return `<row r="${r}"><c r="O${r}" t="e"><f>(K${r}/L${r})*100</f><v>#DIV/0!</v></c></row>`;
    }),
  ];
  const ns =
    'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const relNs =
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  return zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook ${ns} ${relNs}><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><worksheet ${ns}><sheetData>${sheetRows.join("")}</sheetData></worksheet>`,
    ),
  });
}

/**
 * A plausible month: `issuers` companies with three to eight holders each,
 * every position derived from (issuer, holder, seed), so two months built
 * with different seeds differ in a controlled way.
 */
export function syntheticMonth(issuers: number, seed = 0): FixtureRow[] {
  const rows: FixtureRow[] = [];
  const labels = [
    "Corporate",
    "Individual",
    "Bank",
    "Mutual Funds",
    "Securities Company",
    "Insurance",
    "Pension Funds",
    "Foundation",
    "Private Equity",
  ];
  for (let i = 0; i < issuers; i++) {
    const code = String.fromCharCode(
      65 + (Math.floor(i / 676) % 26),
      65 + (Math.floor(i / 26) % 26),
      65 + (i % 26),
      65 + ((i * 7) % 26),
    );
    const holders = 3 + (i % 6);
    let remaining = 9_000;
    for (let h = 0; h < holders; h++) {
      const label = labels[(i + h) % labels.length];
      const unclassified = h === holders - 1 && i % 11 === 0;
      const percent = Math.max(
        101,
        Math.floor(remaining / (h === 0 ? 2 : 3)) - ((seed * 7 + h) % 50),
      );
      remaining -= percent;
      const scripless = (percent * 1_000_003 + seed * 13) * 7;
      rows.push({
        shareCode: code,
        issuerName: `CONTOH ${code} INDONESIA Tbk`,
        investorName: `PT PEMEGANG ${String.fromCharCode(65 + h)} ${code}`,
        investorType: unclassified ? undefined : label,
        localForeign: unclassified ? undefined : h % 3 === 0 ? "F" : "L",
        nationality:
          !unclassified && label === "Individual" ? "INDONESIAN" : undefined,
        domicile: unclassified
          ? undefined
          : h % 3 === 0
            ? "SINGAPORE"
            : "INDONESIA",
        scripless: unclassified ? 0 : scripless,
        scrip: unclassified ? scripless : 0,
        percentHundredths: percent,
      });
    }
  }
  return rows;
}
