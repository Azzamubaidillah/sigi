import { strToU8, zipSync } from "fflate";

/**
 * Minimal workbooks for tests and the CI rebuild check: the parts the XLSX
 * reader needs (workbook, relationships, sheets) and nothing else. Strings
 * are written inline, numbers as numbers, an empty cell as a styled blank.
 */

export type FixtureCell = string | number | null | undefined;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Excel's day number for a YYYY-MM-DD date (days since 1899-12-30). */
export function excelSerial(isoDate: string): number {
  return Math.round(
    (Date.parse(`${isoDate}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000,
  );
}

export function columnLetters(column: number): string {
  let letters = "";
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

export function cellXml(
  column: number,
  row: number,
  value: FixtureCell,
): string {
  const ref = `${columnLetters(column)}${row}`;
  if (value === undefined || value === null) return `<c r="${ref}" s="1"/>`;
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const REL_NS =
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/** A workbook from sheets given as ready `<row>` elements. */
export function zipWorkbook(
  sheets: readonly { name: string; rowsXml: readonly string[] }[],
): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook ${NS} ${REL_NS}><sheets>${sheets
        .map(
          (sheet, i) =>
            `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
        )
        .join("")}</sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join("")}</Relationships>`,
    ),
  };
  sheets.forEach((sheet, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><worksheet ${NS}><sheetData>${sheet.rowsXml.join("")}</sheetData></worksheet>`,
    );
  });
  return zipSync(files);
}

/** A workbook from sheets given as rows of cells, starting at row 1. */
export function buildWorkbook(
  sheets: readonly {
    name: string;
    rows: readonly (readonly FixtureCell[])[];
  }[],
): Uint8Array {
  return zipWorkbook(
    sheets.map((sheet) => ({
      name: sheet.name,
      rowsXml: sheet.rows.map(
        (cells, index) =>
          `<row r="${index + 1}">${cells.map((value, column) => cellXml(column + 1, index + 1, value)).join("")}</row>`,
      ),
    })),
  );
}
