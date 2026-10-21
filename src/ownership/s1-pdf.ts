import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Parser for the monthly ">1% holders" file (DATA-SOURCES S1).
 *
 * The file is an Excel sheet printed to a tagged PDF: one table, a header row
 * repeated on every page, one marked-content sequence per non-empty cell. The
 * parser reads text positions, not the structure tree: the tree carries half a
 * million empty rows and takes minutes to walk, while positions plus the
 * marked-content grouping identify every cell in seconds.
 *
 * It is strict on purpose. Anything outside the layout it knows (a missing
 * header, a cell it cannot place, a number it cannot read, a second record
 * date) fails the whole file with the page and row, and nothing is published
 * (PRD F1). A new layout gets a new version, never a looser match.
 */
export const S1_PARSER_VERSION = "s1-pdf/1";

export const S1_COLUMNS = [
  "DATE",
  "SHARE_CODE",
  "ISSUER_NAME",
  "INVESTOR_NAME",
  "INVESTOR_TYPE",
  "LOCAL_FOREIGN",
  "NATIONALITY",
  "DOMICILE",
  "HOLDINGS_SCRIPLESS",
  "HOLDINGS_SCRIP",
  "TOTAL_HOLDING_SHARES",
  "PERCENTAGE",
] as const;
type Column = (typeof S1_COLUMNS)[number];

/** Columns whose text is centred in its cell, placed by centre. */
const centredColumns = [
  "INVESTOR_TYPE",
  "LOCAL_FOREIGN",
  "NATIONALITY",
  "DOMICILE",
] as const satisfies readonly Column[];
/** Columns whose text is right-aligned, placed by right edge. */
const numericColumns = [
  "HOLDINGS_SCRIPLESS",
  "HOLDINGS_SCRIP",
  "TOTAL_HOLDING_SHARES",
  "PERCENTAGE",
] as const satisfies readonly Column[];

/** How far, in points, a cell may sit from its column's anchor. */
const CENTRE_TOLERANCE = 6;
const RIGHT_EDGE_TOLERANCE = 3;
/** Cells whose baselines differ by less than this share a row (rows are ~5.8pt apart). */
const ROW_TOLERANCE = 1;

export interface S1Row {
  /** 1-based position in the file, which is the publisher's order. */
  rowNumber: number;
  recordDate: string;
  shareCode: string;
  issuerName: string;
  investorName: string;
  investorType: string | null;
  localForeign: string | null;
  nationality: string | null;
  domicile: string | null;
  sharesScripless: number;
  sharesScrip: number;
  sharesTotal: number;
  percentHundredths: number;
}

export type S1ParseResult =
  | { ok: true; recordDate: string; rows: S1Row[]; pages: number }
  | { ok: false; error: string };

interface Cell {
  text: string;
  x0: number;
  x1: number;
  y: number;
  /** Drawn on more than one line: fine in the cover letter, never in the table. */
  wrapped: boolean;
}

class LayoutError extends Error {}

const months: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};
const datePattern = /^(\d{2})-([A-Z][a-z]{2})-(\d{4})$/;
const sharesPattern = /^\d{1,3}(?:\.\d{3})*$/;
const percentPattern = /^(\d{1,3}),(\d{2})$/;

export function parseRecordDate(text: string): string | null {
  const match = datePattern.exec(text);
  const month = match ? months[match[2]] : undefined;
  if (!match || !month) return null;
  const iso = `${match[3]}-${month}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toISOString().slice(0, 10) === iso ? iso : null;
}

function parseShares(text: string, where: string): number {
  if (!sharesPattern.test(text)) {
    throw new LayoutError(`${where}: shares "${text}" are not a whole number`);
  }
  const value = Number(text.replaceAll(".", ""));
  if (!Number.isSafeInteger(value)) {
    throw new LayoutError(`${where}: shares "${text}" exceed exact range`);
  }
  return value;
}

function parsePercent(text: string, where: string): number {
  const match = percentPattern.exec(text);
  if (!match) {
    throw new LayoutError(`${where}: percentage "${text}" is not NN,NN`);
  }
  return Number(match[1]) * 100 + Number(match[2]);
}

/**
 * Groups text items into cells by their marked-content sequence: a name the
 * PDF draws as two runs ("NI MADE …" and "SE") is still one cell. Text outside
 * any sequence becomes a cell of its own, and artifacts are dropped.
 */
function cellsOf(items: readonly unknown[]): Cell[] {
  const cells: Cell[] = [];
  // One entry per open marked-content sequence: the cell it collects into,
  // "artifact" for page furniture, or null for a sequence without an id.
  const stack: (Cell | "artifact" | null)[] = [];
  const newCell = (): Cell => ({
    text: "",
    x0: Infinity,
    x1: -Infinity,
    y: NaN,
    wrapped: false,
  });
  for (const raw of items) {
    const item = raw as {
      type?: string;
      id?: string | null;
      tag?: string;
      str?: string;
      width?: number;
      transform?: number[];
    };
    if (
      item.type === "beginMarkedContent" ||
      item.type === "beginMarkedContentProps"
    ) {
      if (item.tag === "Artifact") stack.push("artifact");
      else if (item.id) {
        const cell = newCell();
        cells.push(cell);
        stack.push(cell);
      } else stack.push(null);
      continue;
    }
    if (item.type === "endMarkedContent") {
      stack.pop();
      continue;
    }
    if (stack.includes("artifact")) continue;
    if (item.str === undefined || !item.transform || item.str.trim() === "") {
      continue;
    }
    const enclosing = stack.findLast((entry) => entry !== null);
    let cell: Cell;
    if (enclosing && enclosing !== "artifact") cell = enclosing;
    else {
      cell = newCell();
      cells.push(cell);
    }
    const x = item.transform[4];
    const y = item.transform[5];
    if (Number.isNaN(cell.y)) cell.y = y;
    else if (Math.abs(cell.y - y) > ROW_TOLERANCE) cell.wrapped = true;
    cell.text = cell.text === "" ? item.str : `${cell.text} ${item.str}`;
    cell.x0 = Math.min(cell.x0, x);
    cell.x1 = Math.max(cell.x1, x + (item.width ?? 0));
  }
  return cells
    .filter((cell) => cell.text.trim() !== "")
    .map((cell) => ({ ...cell, text: cell.text.replace(/\s+/g, " ").trim() }));
}

interface HeaderGeometry {
  y: number;
  centre: Record<Column, number>;
  right: Record<Column, number>;
  /** Cells starting at or right of this are categorical or numeric. */
  zoneStart: number;
}

function findHeader(cells: Cell[]): HeaderGeometry | null {
  const anchor = cells.find((cell) => cell.text === "SHARE_CODE");
  if (!anchor) return null;
  const row = cells
    .filter((cell) => Math.abs(cell.y - anchor.y) < ROW_TOLERANCE)
    .sort((a, b) => a.x0 - b.x0);
  const labels = row.map((cell) => cell.text);
  if (labels.join("|") !== S1_COLUMNS.join("|")) {
    throw new LayoutError(
      `header is ${labels.join(", ")}; expected ${S1_COLUMNS.join(", ")}`,
    );
  }
  const centre = {} as Record<Column, number>;
  const right = {} as Record<Column, number>;
  row.forEach((cell, index) => {
    centre[S1_COLUMNS[index]] = (cell.x0 + cell.x1) / 2;
    right[S1_COLUMNS[index]] = cell.x1;
  });
  const typeToLocal = centre.LOCAL_FOREIGN - centre.INVESTOR_TYPE;
  return {
    y: anchor.y,
    centre,
    right,
    zoneStart: centre.INVESTOR_TYPE - typeToLocal / 2,
  };
}

function groupRows(cells: Cell[]): Cell[][] {
  const sorted = [...cells].sort((a, b) => b.y - a.y || a.x0 - b.x0);
  const rows: Cell[][] = [];
  for (const cell of sorted) {
    const current = rows.at(-1);
    if (current && Math.abs(current[0].y - cell.y) < ROW_TOLERANCE) {
      current.push(cell);
    } else {
      rows.push([cell]);
    }
  }
  return rows.map((row) => row.sort((a, b) => a.x0 - b.x0));
}

function placeRow(row: Cell[], header: HeaderGeometry, where: string) {
  const text = row.filter((cell) => cell.x0 < header.zoneStart);
  if (text.length !== 4) {
    throw new LayoutError(
      `${where}: expected date, code, issuer and investor, found ${text.length} cells (${text.map((c) => c.text).join(" | ")})`,
    );
  }
  const placed: Partial<Record<Column, string>> = {
    DATE: text[0].text,
    SHARE_CODE: text[1].text,
    ISSUER_NAME: text[2].text,
    INVESTOR_NAME: text[3].text,
  };
  for (const [column, cell] of [
    ["DATE", text[0]],
    ["SHARE_CODE", text[1]],
  ] as const) {
    const offset = Math.abs((cell.x0 + cell.x1) / 2 - header.centre[column]);
    if (offset > CENTRE_TOLERANCE) {
      throw new LayoutError(`${where}: "${cell.text}" is not under ${column}`);
    }
  }
  for (const cell of row.filter((c) => c.x0 >= header.zoneStart)) {
    let best: { column: Column; distance: number; limit: number } | null = null;
    for (const column of centredColumns) {
      const distance = Math.abs(
        (cell.x0 + cell.x1) / 2 - header.centre[column],
      );
      if (!best || distance < best.distance) {
        best = { column, distance, limit: CENTRE_TOLERANCE };
      }
    }
    for (const column of numericColumns) {
      const distance = Math.abs(cell.x1 - header.right[column]);
      if (!best || distance < best.distance) {
        best = { column, distance, limit: RIGHT_EDGE_TOLERANCE };
      }
    }
    if (!best || best.distance > best.limit) {
      throw new LayoutError(
        `${where}: cannot place "${cell.text}" in a column`,
      );
    }
    if (placed[best.column] !== undefined) {
      throw new LayoutError(`${where}: two cells under ${best.column}`);
    }
    placed[best.column] = cell.text;
  }
  for (const column of numericColumns) {
    if (placed[column] === undefined) {
      throw new LayoutError(`${where}: ${column} is empty`);
    }
  }
  return placed;
}

export async function parseS1Pdf(bytes: Uint8Array): Promise<S1ParseResult> {
  // A copy: pdf.js transfers the buffer it is given, which would empty the
  // caller's bytes that are about to be hashed and stored.
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  let document;
  try {
    document = await task.promise;
  } catch (error) {
    await task.destroy();
    return {
      ok: false,
      error: `not a readable PDF: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  try {
    const rows: S1Row[] = [];
    let recordDate: string | null = null;
    let tables = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: true });
      const cells = cellsOf(content.items);
      const header = findHeader(cells);
      if (!header) {
        // A page with no header must carry no rows either: a header dropped
        // from a page would otherwise drop that page's rows without a trace.
        const stray = cells.find((cell) => parseRecordDate(cell.text) !== null);
        if (stray) {
          throw new LayoutError(
            `page ${pageNumber}: row data without the column header`,
          );
        }
        continue;
      }
      tables += 1;
      const body = cells.filter((cell) => cell.y < header.y - ROW_TOLERANCE);
      const wrapped = body.find((cell) => cell.wrapped);
      if (wrapped) {
        throw new LayoutError(
          `page ${pageNumber}: cell "${wrapped.text}" wraps onto a second line`,
        );
      }
      for (const [index, row] of groupRows(body).entries()) {
        const where = `page ${pageNumber}, row ${index + 1}`;
        const placed = placeRow(row, header, where);
        const date = parseRecordDate(placed.DATE ?? "");
        if (!date) {
          throw new LayoutError(
            `${where}: date "${placed.DATE}" is not DD-Mon-YYYY`,
          );
        }
        if (recordDate !== null && date !== recordDate) {
          throw new LayoutError(
            `${where}: record date ${date} differs from ${recordDate}`,
          );
        }
        recordDate = date;
        rows.push({
          rowNumber: rows.length + 1,
          recordDate: date,
          shareCode: placed.SHARE_CODE ?? "",
          issuerName: placed.ISSUER_NAME ?? "",
          investorName: placed.INVESTOR_NAME ?? "",
          investorType: placed.INVESTOR_TYPE ?? null,
          localForeign: placed.LOCAL_FOREIGN ?? null,
          nationality: placed.NATIONALITY ?? null,
          domicile: placed.DOMICILE ?? null,
          sharesScripless: parseShares(placed.HOLDINGS_SCRIPLESS ?? "", where),
          sharesScrip: parseShares(placed.HOLDINGS_SCRIP ?? "", where),
          sharesTotal: parseShares(placed.TOTAL_HOLDING_SHARES ?? "", where),
          percentHundredths: parsePercent(placed.PERCENTAGE ?? "", where),
        });
      }
    }
    if (tables === 0 || recordDate === null) {
      return { ok: false, error: "no holders table found" };
    }
    return { ok: true, recordDate, rows, pages: document.numPages };
  } catch (error) {
    if (error instanceof LayoutError)
      return { ok: false, error: error.message };
    return {
      ok: false,
      error: `unreadable content: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    await task.destroy();
  }
}
