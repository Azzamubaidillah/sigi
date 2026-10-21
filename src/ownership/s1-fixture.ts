import { S1_COLUMNS } from "./s1-pdf";

/**
 * Builds a synthetic PDF in the layout of the published >1% holders file, for
 * tests and the CI rebuild check. The real file is not committed: it names
 * individuals, and redistributing it is not ours to do (DATA-SOURCES S1).
 *
 * What it reproduces is what the parser depends on: an A4 cover page with
 * multi-line text, landscape table pages with the header repeated, one
 * marked-content sequence per non-empty cell (some drawn as two runs),
 * centred, left- and right-aligned columns at the real file's positions, empty
 * cells for unclassified holders, and page furniture marked as an artifact.
 * Text is Courier so widths are exact without embedding a font.
 */

type Column = (typeof S1_COLUMNS)[number];
type Align = "centre" | "left" | "right";

/** Cell extents measured from the 2026-02-27 file, in points. */
const CELLS: Record<Column, readonly [number, number, Align]> = {
  DATE: [20.5, 45.1, "centre"],
  SHARE_CODE: [45.1, 74.2, "centre"],
  ISSUER_NAME: [74.2, 167.4, "left"],
  INVESTOR_NAME: [167.4, 419.7, "left"],
  INVESTOR_TYPE: [419.7, 454.7, "centre"],
  LOCAL_FOREIGN: [454.7, 489.9, "centre"],
  NATIONALITY: [489.9, 534.5, "centre"],
  DOMICILE: [534.5, 606.9, "centre"],
  HOLDINGS_SCRIPLESS: [606.9, 652.9, "right"],
  HOLDINGS_SCRIP: [652.9, 689.8, "right"],
  TOTAL_HOLDING_SHARES: [689.8, 744.2, "right"],
  PERCENTAGE: [744.2, 772.2, "right"],
};
const FONT_SIZE = 4.44;
const CHAR_WIDTH = 0.6 * FONT_SIZE;
const HEADER_Y = 595.68;
const ROW_STEP = 5.76;
const LEFT_PAD = 0.8;
const RIGHT_PAD = 1.4;

export interface FixtureRow {
  shareCode: string;
  issuerName: string;
  investorName: string;
  /** Drawn as a second run inside the investor cell, as the real file does. */
  investorNameTail?: string;
  investorType?: string;
  localForeign?: string;
  nationality?: string;
  domicile?: string;
  scripless: number;
  scrip: number;
  /** Defaults to scripless + scrip. */
  total?: number;
  percentHundredths: number;
  /** Printed instead of the formatted percentage, to model a malformed cell. */
  percentText?: string;
  /** Overrides the record date on this row only. */
  date?: string;
}

export interface FixtureOptions {
  /** As printed, e.g. "27-Feb-2026". */
  recordDate: string;
  rowsPerPage?: number;
  /** Draw this table page (1-based among table pages) without its header. */
  omitHeaderOnPage?: number;
  /** Extra text drawn between the investor and type columns on this row index. */
  strayCellOnRow?: number;
}

export function formatShares(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatPercent(hundredths: number): string {
  return `${Math.floor(hundredths / 100)},${String(hundredths % 100).padStart(2, "0")}`;
}

function escapePdf(text: string): string {
  return text.replace(/[\\()]/g, (character) => `\\${character}`);
}

function xFor(column: Column, text: string): number {
  const [left, right, align] = CELLS[column];
  const width = text.length * CHAR_WIDTH;
  if (align === "left") return left + LEFT_PAD;
  if (align === "right") return right - RIGHT_PAD - width;
  return (left + right) / 2 - width / 2;
}

class ContentWriter {
  private parts: string[] = [];
  private mcid = 0;

  run(x: number, y: number, text: string): string {
    return `BT /F1 ${FONT_SIZE} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdf(text)}) Tj ET`;
  }

  cell(runs: readonly (readonly [number, number, string])[]): void {
    this.parts.push(
      `/P <</MCID ${this.mcid++}>> BDC ${runs.map((r) => this.run(...r)).join(" ")} EMC`,
    );
  }

  artifact(x: number, y: number, text: string): void {
    this.parts.push(`/Artifact BMC ${this.run(x, y, text)} EMC`);
  }

  toString(): string {
    return this.parts.join("\n");
  }
}

function coverPage(): string {
  const writer = new ContentWriter();
  writer.cell([
    [72, 760, "Menindaklanjuti surat Keputusan Dewan Komisioner (KDK) OJK"],
    [72, 748, "bersama ini kami sampaikan laporan total kepemilikan saham."],
  ]);
  writer.cell([[72, 700, "Hormat kami, Kustodian (synthetic fixture)"]]);
  return writer.toString();
}

function tablePage(
  rows: readonly FixtureRow[],
  firstIndex: number,
  options: FixtureOptions,
  withHeader: boolean,
): string {
  const writer = new ContentWriter();
  writer.artifact(380, 20, "Page");
  if (withHeader) {
    for (const column of S1_COLUMNS) {
      writer.cell([[xFor(column, column), HEADER_Y, column]]);
    }
  }
  rows.forEach((row, offset) => {
    const y = HEADER_Y - ROW_STEP * (offset + 1);
    const values: Partial<Record<Column, string>> = {
      DATE: row.date ?? options.recordDate,
      SHARE_CODE: row.shareCode,
      ISSUER_NAME: row.issuerName,
      INVESTOR_TYPE: row.investorType,
      LOCAL_FOREIGN: row.localForeign,
      NATIONALITY: row.nationality,
      DOMICILE: row.domicile,
      HOLDINGS_SCRIPLESS: formatShares(row.scripless),
      HOLDINGS_SCRIP: formatShares(row.scrip),
      TOTAL_HOLDING_SHARES: formatShares(
        row.total ?? row.scripless + row.scrip,
      ),
      PERCENTAGE: row.percentText ?? formatPercent(row.percentHundredths),
    };
    for (const column of S1_COLUMNS) {
      if (column === "INVESTOR_NAME") {
        const head: [number, number, string] = [
          xFor(column, row.investorName),
          y,
          row.investorName,
        ];
        writer.cell(
          row.investorNameTail
            ? [
                head,
                [
                  head[0] + (row.investorName.length + 2) * CHAR_WIDTH,
                  y,
                  row.investorNameTail,
                ],
              ]
            : [head],
        );
        if (options.strayCellOnRow === firstIndex + offset) {
          writer.cell([[395, y, "STRAY"]]);
        }
        continue;
      }
      const value = values[column];
      if (value === undefined || value === "") continue;
      writer.cell([[xFor(column, value), y, value]]);
    }
  });
  return writer.toString();
}

/** Serialises pages into a minimal, valid PDF with a correct xref table. */
function assemble(
  pages: readonly { content: string; size: [number, number] }[],
): Uint8Array {
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R /MarkInfo << /Marked true >> >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>";
  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.size[0]} ${page.size[1]}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] =
      `<< /Length ${page.content.length} >>\nstream\n${page.content}\nendstream`;
  });
  let body = "%PDF-1.7\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

export function buildS1FixturePdf(
  rows: readonly FixtureRow[],
  options: FixtureOptions,
): Uint8Array {
  const perPage = options.rowsPerPage ?? 100;
  const pages: { content: string; size: [number, number] }[] = [
    { content: coverPage(), size: [595.32, 841.92] },
  ];
  for (let start = 0, page = 1; start < rows.length; start += perPage, page++) {
    pages.push({
      content: tablePage(
        rows.slice(start, start + perPage),
        start,
        options,
        options.omitHeaderOnPage !== page,
      ),
      size: [792, 612],
    });
  }
  return assemble(pages);
}

/**
 * A plausible month: `issuers` companies with three to eight holders each,
 * every holder's position derived from (issuer, holder, seed) so two months
 * built with different seeds differ in a controlled way.
 */
export function syntheticMonth(issuers: number, seed = 0): FixtureRow[] {
  const rows: FixtureRow[] = [];
  const types = ["CP", "ID", "IB", "MF", "SC", "IS", "PF", "FD", "OT"];
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
      const type = types[(i + h) % types.length];
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
        investorNameTail: h === 1 && i % 17 === 0 ? "SE" : undefined,
        investorType: unclassified ? undefined : type,
        localForeign: unclassified ? undefined : h % 3 === 0 ? "A" : "L",
        nationality: !unclassified && type === "ID" ? "INDONESIAN" : undefined,
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
