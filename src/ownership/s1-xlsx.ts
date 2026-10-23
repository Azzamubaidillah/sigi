import { readXlsxWorksheet, XlsxParseError } from "../imports/xlsx";

/**
 * Parser for the monthly ">1% holders" workbook (DATA-SOURCES S1) as the
 * exchange publishes it on its share-ownership data page: one sheet, a block
 * of disclaimers, then a header row and one row per issuer–holder pair.
 *
 * Two header variants are known, and both are accepted: column E is
 * INVESTOR_TYPE (KSEI codes, files to 2026-03-31) or INVESTOR_CLASSIFICATION
 * (labels such as "Corporate", from 2026-04-30). Anything else about the
 * layout (another column, a second record date, a malformed number) fails
 * the whole file with the row, and nothing is published (PRD F1).
 */
export const S1_PARSER_VERSION = "s1-xlsx/1";

const EXPECTED_HEADER = [
  "DATE",
  "SHARE_CODE",
  "ISSUER_NAME",
  "INVESTOR_NAME",
  ["INVESTOR_TYPE", "INVESTOR_CLASSIFICATION"],
  "LOCAL_FOREIGN",
  "NATIONALITY",
  "DOMICILE",
  "HOLDINGS_SCRIPLESS",
  "HOLDINGS_SCRIP",
  "TOTAL_HOLDING_SHARES",
  "PERCENTAGE",
] as const;

export interface S1Row {
  /** 1-based position among the data rows, which is the publisher's order. */
  rowNumber: number;
  recordDate: string;
  shareCode: string;
  issuerName: string;
  investorName: string;
  /** A KSEI code ("CP") or a classification label ("Corporate"), as published. */
  investorType: string | null;
  /** "L" local, "F" foreign (published as "A" until March 2026), or null. */
  localForeign: string | null;
  nationality: string | null;
  domicile: string | null;
  sharesScripless: number;
  sharesScrip: number;
  sharesTotal: number;
  percentHundredths: number;
}

export type S1ParseResult =
  | { ok: true; recordDate: string; rows: S1Row[] }
  | { ok: false; error: string };

class LayoutError extends Error {}

/** Excel stores dates as days since 1899-12-30. */
export function excelSerialDate(text: string): string | null {
  if (!/^\d{5}$/.test(text)) return null;
  const date = new Date(Date.UTC(1899, 11, 30) + Number(text) * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function shares(value: string | null, where: string): number {
  if (value === null || !/^\d+$/.test(value)) {
    throw new LayoutError(`${where}: shares "${value}" are not a whole number`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new LayoutError(`${where}: shares "${value}" exceed exact range`);
  }
  return parsed;
}

/**
 * Scripless and scrip holdings, where an empty cell is zero: the April 2026
 * file leaves one scrip cell blank on a row whose total equals its scripless
 * holding. The total itself may never be empty.
 */
function sharesOrZero(value: string | null, where: string): number {
  return value === null ? 0 : shares(value, where);
}

/**
 * Excel stores a cell typed as TRUE as a boolean, and the files carry the
 * ticker TRUE that way (the reader gives "true"). Any other code is as published.
 */
function shareCodeOf(value: string): string {
  return value === "true" || value === "false" ? value.toUpperCase() : value;
}

/**
 * The published percentage in hundredths of a percent. Most months carry two
 * decimals (stored by Excel as e.g. 1.1499999999999999); the April 2026 file
 * carries full precision (36.108405090747539). Both are rounded to hundredths,
 * the precision every other month is published at. Text, negatives and
 * values above 100 are refused.
 */
function percent(value: string | null, where: string): number {
  const parsed =
    value !== null && /^\d+(\.\d+)?(E-\d+)?$/i.test(value)
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed > 100) {
    throw new LayoutError(
      `${where}: percentage "${value}" is not a number from 0 to 100`,
    );
  }
  return Math.round(parsed * 100);
}

function localForeign(value: string | null, where: string): string | null {
  if (value === null) return null;
  if (value === "L") return "L";
  if (value === "A" || value === "F") return "F";
  throw new LayoutError(`${where}: local/foreign "${value}" is not L, A or F`);
}

export function parseS1Xlsx(bytes: Uint8Array): S1ParseResult {
  try {
    const sheet = readXlsxWorksheet(bytes, null);
    const header = sheet.rows.find((row) =>
      row.cells.some((cell) => cell.value === "SHARE_CODE"),
    );
    if (!header) throw new LayoutError("no header row with SHARE_CODE");
    const labels = header.cells
      .filter((cell) => text(cell.value) !== null)
      .map((cell) => ({ column: cell.column, label: text(cell.value)! }));
    const matches =
      labels.length === EXPECTED_HEADER.length &&
      labels.every(({ column, label }, index) => {
        const expected = EXPECTED_HEADER[index];
        return (
          column === index + 1 &&
          (typeof expected === "string"
            ? label === expected
            : expected.includes(label as never))
        );
      });
    if (!matches) {
      throw new LayoutError(
        `header is ${labels.map((l) => l.label).join(", ")}; expected the twelve known columns in order`,
      );
    }

    const rows: S1Row[] = [];
    let recordDate: string | null = null;
    for (const row of sheet.rows) {
      if (row.rowNumber <= header.rowNumber) continue;
      const cell = new Map<number, string | null>();
      let beyond: number | null = null;
      for (const c of row.cells) {
        const value = text(c.value);
        if (c.column > 12) {
          if (value !== null) beyond ??= c.column;
          continue;
        }
        if (!cell.has(c.column) || value !== null) cell.set(c.column, value);
      }
      // A row empty in the table's twelve columns is skipped, whatever lies
      // beside it: the April 2026 file has leftover #DIV/0! formulas in
      // column O below its last holder.
      if ([...cell.values()].every((value) => value === null)) continue;
      // A holder row with a value past the twelfth column is a layout change.
      if (beyond !== null) {
        throw new LayoutError(
          `row ${row.rowNumber}: value in column ${beyond}`,
        );
      }
      const where = `row ${row.rowNumber}`;
      const date = excelSerialDate(cell.get(1) ?? "");
      if (!date)
        throw new LayoutError(
          `${where}: date "${cell.get(1)}" is not an Excel date`,
        );
      if (recordDate !== null && date !== recordDate) {
        throw new LayoutError(
          `${where}: record date ${date} differs from ${recordDate}`,
        );
      }
      recordDate = date;
      const shareCode = cell.get(2) ? shareCodeOf(cell.get(2)!) : null;
      const issuerName = cell.get(3);
      const investorName = cell.get(4);
      if (!shareCode || !issuerName || !investorName) {
        throw new LayoutError(`${where}: code, issuer or investor is empty`);
      }
      rows.push({
        rowNumber: rows.length + 1,
        recordDate: date,
        shareCode,
        issuerName,
        investorName,
        investorType: cell.get(5) ?? null,
        localForeign: localForeign(cell.get(6) ?? null, where),
        nationality: cell.get(7) ?? null,
        domicile: cell.get(8) ?? null,
        sharesScripless: sharesOrZero(cell.get(9) ?? null, where),
        sharesScrip: sharesOrZero(cell.get(10) ?? null, where),
        sharesTotal: shares(cell.get(11) ?? null, where),
        percentHundredths: percent(cell.get(12) ?? null, where),
      });
    }
    if (recordDate === null) return { ok: false, error: "no holder rows" };
    return { ok: true, recordDate, rows };
  } catch (error) {
    if (error instanceof LayoutError || error instanceof XlsxParseError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
