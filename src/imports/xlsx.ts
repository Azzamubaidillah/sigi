import { strFromU8, unzipSync } from "fflate";

const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 3_000;

export class XlsxParseError extends Error {
  constructor(
    readonly code:
      | "ARCHIVE_TOO_LARGE"
      | "INVALID_ARCHIVE"
      | "UNSAFE_ARCHIVE"
      | "NOT_A_WORKBOOK"
      | "SHEET_NOT_FOUND"
      | "INVALID_CELL_REFERENCE"
      | "INVALID_SHARED_STRING",
    message: string,
  ) {
    super(message);
    this.name = "XlsxParseError";
  }
}

export interface XlsxCell {
  address: string;
  column: number;
  value: string | null;
  formula: string | null;
}

export interface XlsxRow {
  rowNumber: number;
  cells: XlsxCell[];
}

export interface XlsxWorksheet {
  name: string;
  rows: XlsxRow[];
}

type Archive = Record<string, Uint8Array>;

function assertArchiveSize(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new XlsxParseError(
      "ARCHIVE_TOO_LARGE",
      `XLSX files must be at most ${MAX_ARCHIVE_BYTES} bytes.`,
    );
  }
}

function unzipWorkbook(bytes: Uint8Array): Archive {
  assertArchiveSize(bytes);
  let archive: Archive;
  try {
    archive = unzipSync(bytes);
  } catch {
    throw new XlsxParseError(
      "INVALID_ARCHIVE",
      "The file is not a readable XLSX archive.",
    );
  }

  const entries = Object.entries(archive);
  const uncompressedBytes = entries.reduce(
    (total, [, value]) => total + value.byteLength,
    0,
  );
  if (
    entries.length > MAX_ARCHIVE_ENTRIES ||
    uncompressedBytes > MAX_UNCOMPRESSED_BYTES
  ) {
    throw new XlsxParseError(
      "UNSAFE_ARCHIVE",
      "The XLSX archive exceeds the supported expansion limit.",
    );
  }
  if (!archive["xl/workbook.xml"] || !archive["xl/_rels/workbook.xml.rels"]) {
    throw new XlsxParseError(
      "NOT_A_WORKBOOK",
      "The archive does not contain an Excel workbook.",
    );
  }
  return archive;
}

function xml(archive: Archive, fileName: string): string {
  const bytes = archive[fileName];
  if (!bytes) {
    throw new XlsxParseError(
      "NOT_A_WORKBOOK",
      `The workbook is missing ${fileName}.`,
    );
  }
  return strFromU8(bytes);
}

function decodeXml(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|quot);/gi,
    (entity) => {
      const lower = entity.toLowerCase();
      if (lower === "&amp;") return "&";
      if (lower === "&apos;") return "'";
      if (lower === "&gt;") return ">";
      if (lower === "&lt;") return "<";
      if (lower === "&quot;") return '"';
      const number = lower.startsWith("&#x")
        ? Number.parseInt(lower.slice(3, -1), 16)
        : Number.parseInt(lower.slice(2, -1), 10);
      return Number.isSafeInteger(number)
        ? String.fromCodePoint(number)
        : entity;
    },
  );
}

function attributes(raw: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const match of raw.matchAll(/([:\w.-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
    output[match[1]] = decodeXml(match[3]);
  }
  return output;
}

function elements(
  xmlText: string,
  name: string,
): Array<{ attributes: string; body: string }> {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = "(?:[\\w.-]+:)?";
  // `(?<!\/)>` keeps a self-closing `<c r="G7" s="20"/>` out of the paired
  // pattern; without it the empty cell swallowed the next cell as its body.
  const pairedPattern = new RegExp(
    `<${prefix}${escaped}\\b([^>]*?)(?<!\\/)>([\\s\\S]*?)<\\/${prefix}${escaped}>`,
    "g",
  );
  const selfClosingPattern = new RegExp(
    `<${prefix}${escaped}\\b([^>]*)\\/>`,
    "g",
  );
  return [
    ...[...xmlText.matchAll(pairedPattern)].map((match) => ({
      index: match.index ?? 0,
      attributes: match[1],
      body: match[2],
    })),
    ...[...xmlText.matchAll(selfClosingPattern)].map((match) => ({
      index: match.index ?? 0,
      attributes: match[1],
      body: "",
    })),
  ]
    .sort((left, right) => left.index - right.index)
    .map(({ attributes, body }) => ({ attributes, body }));
}

function firstElementText(xmlText: string, name: string): string | null {
  const found = elements(xmlText, name)[0];
  return found ? decodeXml(found.body.replace(/<[^>]+>/g, "")) : null;
}

/**
 * A relationship target as a path inside the archive. Targets in
 * `xl/_rels/workbook.xml.rels` are relative to `xl/` unless they start with
 * "/" (Excel writes "worksheets/sheet1.xml"; some writers "/xl/…").
 */
function zipPath(target: string): string {
  const slashed = target.replace(/\\/g, "/");
  const normalized = slashed.startsWith("/")
    ? slashed.replace(/^\/+/, "")
    : `xl/${slashed}`;
  if (normalized.includes("..") || !normalized.startsWith("xl/")) {
    throw new XlsxParseError(
      "UNSAFE_ARCHIVE",
      "The workbook contains an unsafe worksheet path.",
    );
  }
  return normalized;
}

function sharedStrings(archive: Archive): string[] {
  const source = archive["xl/sharedStrings.xml"];
  if (!source) return [];
  return elements(strFromU8(source), "si").map(({ body }) =>
    decodeXml(body.replace(/<[^>]+>/g, "")),
  );
}

function columnFromCellReference(address: string): number {
  const match = /^([A-Z]+)([1-9]\d*)$/.exec(address);
  if (!match) {
    throw new XlsxParseError(
      "INVALID_CELL_REFERENCE",
      `Unsupported XLSX cell reference: ${address}.`,
    );
  }
  return [...match[1]].reduce(
    (column, character) => column * 26 + character.charCodeAt(0) - 64,
    0,
  );
}

function cellValue(
  body: string,
  type: string | undefined,
  strings: string[],
): string | null {
  const rawValue = firstElementText(body, "v");
  if (type === "s") {
    const index =
      rawValue === null ? Number.NaN : Number.parseInt(rawValue, 10);
    if (!Number.isInteger(index) || index < 0 || strings[index] === undefined) {
      throw new XlsxParseError(
        "INVALID_SHARED_STRING",
        "The workbook refers to an unavailable shared string.",
      );
    }
    return strings[index];
  }
  if (type === "inlineStr") return firstElementText(body, "is") ?? "";
  if (type === "b")
    return rawValue === "1" ? "true" : rawValue === "0" ? "false" : rawValue;
  return rawValue;
}

/** The named sheet, or the workbook's only sheet when `requestedName` is null. */
function worksheetPath(
  archive: Archive,
  requestedName: string | null,
): { name: string; path: string } {
  const workbookSheets = elements(xml(archive, "xl/workbook.xml"), "sheet");
  const sheet =
    requestedName === null
      ? workbookSheets.length === 1
        ? workbookSheets[0]
        : undefined
      : workbookSheets.find(
          ({ attributes: raw }) => attributes(raw).name === requestedName,
        );
  if (!sheet) {
    throw new XlsxParseError(
      "SHEET_NOT_FOUND",
      requestedName === null
        ? `The workbook has ${workbookSheets.length} sheets; expected exactly one.`
        : `The workbook has no sheet named ${requestedName}.`,
    );
  }
  const sheetAttributes = attributes(sheet.attributes);
  const name = sheetAttributes.name ?? "";
  const relationId = sheetAttributes["r:id"];
  const relations = elements(
    xml(archive, "xl/_rels/workbook.xml.rels"),
    "Relationship",
  );
  const relation = relations.find(
    ({ attributes: raw }) => attributes(raw).Id === relationId,
  );
  if (!relation) {
    throw new XlsxParseError(
      "NOT_A_WORKBOOK",
      `The workbook has no worksheet relationship for ${name}.`,
    );
  }
  return { name, path: zipPath(attributes(relation.attributes).Target ?? "") };
}

/**
 * Reads cell values from a worksheet: the named one, or the only one when the
 * name is null. Formulas are kept separately from their cached result.
 */
export function readXlsxWorksheet(
  bytes: Uint8Array,
  requestedName: string | null,
): XlsxWorksheet {
  const archive = unzipWorkbook(bytes);
  const strings = sharedStrings(archive);
  const sheet = worksheetPath(archive, requestedName);
  const sheetXml = xml(archive, sheet.path);
  const rows: XlsxRow[] = [];

  for (const row of elements(sheetXml, "row")) {
    const rowNumber = Number.parseInt(attributes(row.attributes).r ?? "", 10);
    if (!Number.isInteger(rowNumber) || rowNumber < 1) continue;
    const cells = elements(row.body, "c").map(({ attributes: raw, body }) => {
      const cellAttributes = attributes(raw);
      const address = cellAttributes.r ?? "";
      return {
        address,
        column: columnFromCellReference(address),
        value: cellValue(body, cellAttributes.t, strings),
        formula: firstElementText(body, "f"),
      };
    });
    if (cells.length > 0) rows.push({ rowNumber, cells });
  }

  return { name: sheet.name, rows };
}
