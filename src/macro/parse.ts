import { readXlsxWorksheet } from "../imports/xlsx";
import type { SeriesId } from "./series";

/**
 * Parsers for the macro sources. Each takes the file exactly as fetched and
 * returns observations per series, oldest first, or the reason it cannot be
 * read. Any surprise in the layout fails the whole file: a figure is never
 * guessed.
 */

export interface Observation {
  /** YYYY-MM-DD for daily and meeting series, YYYY-MM for monthly ones. */
  period: string;
  value: number;
}

export type MacroParseResult =
  | { ok: true; series: Map<SeriesId, Observation[]> }
  | { ok: false; error: string };

class LayoutError extends Error {}

const MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

const pad = (n: number): string => String(n).padStart(2, "0");

function isoDate(
  year: number,
  month: number,
  day: number,
  where: string,
): string {
  const date = `${year}-${pad(month)}-${pad(day)}`;
  if (!new Date(`${date}T00:00:00Z`).toISOString().startsWith(date)) {
    throw new LayoutError(`${where}: ${date} is not a date`);
  }
  return date;
}

/** "16.680,00", "5,75 %", "146.320": Indonesian separators, '.' for thousands. */
export function indonesianNumber(text: string, where: string): number {
  const cleaned = text.replace(/%/g, "").trim();
  if (!/^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(cleaned)) {
    throw new LayoutError(`${where}: "${text}" is not a number`);
  }
  return Number(cleaned.replace(/\./g, "").replace(",", "."));
}

function sorted(observations: Observation[], where: string): Observation[] {
  observations.sort((a, b) => a.period.localeCompare(b.period));
  for (let i = 1; i < observations.length; i++) {
    if (observations[i].period === observations[i - 1].period) {
      throw new LayoutError(
        `${where}: ${observations[i].period} appears twice`,
      );
    }
  }
  return observations;
}

function attempt(read: () => Map<SeriesId, Observation[]>): MacroParseResult {
  try {
    return { ok: true, series: read() };
  } catch (error) {
    if (error instanceof LayoutError)
      return { ok: false, error: error.message };
    return {
      ok: false,
      error: `not a readable file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** The four Bank Indonesia exports: one table of number, period and value. */
export const BI_LAYOUTS = {
  "bi-rate": { series: "bi-rate", header: ["no", "tanggal", "bi-7day-rr"] },
  "bi-inflation": {
    series: "cpi-yoy",
    header: ["no", "periode", "data inflasi"],
  },
  "bi-jisdor": { series: "jisdor", header: ["no", "tanggal", "kurs"] },
  "bi-reserves": {
    series: "fx-reserves",
    header: ["no", "tanggal", "cadangan devisa"],
  },
} as const satisfies Record<
  string,
  { series: SeriesId; header: readonly string[] }
>;
export type BiLayout = keyof typeof BI_LAYOUTS;

/** A period in the form each BI export writes it. */
function biPeriod(layout: BiLayout, text: string, where: string): string {
  switch (layout) {
    case "bi-rate": {
      // "21 Oktober 2026"
      const match = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(text);
      const month = match ? MONTHS[match[2].toLowerCase()] : undefined;
      if (!match || !month)
        throw new LayoutError(
          `${where}: date "${text}" is not "day month year"`,
        );
      return isoDate(Number(match[3]), month, Number(match[1]), where);
    }
    case "bi-inflation": {
      // "September 2026"
      const match = /^([A-Za-z]+) (\d{4})$/.exec(text);
      const month = match ? MONTHS[match[1].toLowerCase()] : undefined;
      if (!match || !month)
        throw new LayoutError(`${where}: period "${text}" is not "month year"`);
      return `${match[2]}-${pad(month)}`;
    }
    case "bi-jisdor": {
      // "10/1/2025 12:00:00 AM": month first.
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) 12:00:00 AM$/.exec(text);
      if (!match)
        throw new LayoutError(
          `${where}: date "${text}" is not "M/D/YYYY 12:00:00 AM"`,
        );
      return isoDate(
        Number(match[3]),
        Number(match[1]),
        Number(match[2]),
        where,
      );
    }
    case "bi-reserves": {
      // An Excel serial date at the end of the month.
      if (!/^\d{5}$/.test(text))
        throw new LayoutError(`${where}: date "${text}" is not an Excel date`);
      const date = new Date(Date.UTC(1899, 11, 30) + Number(text) * 86_400_000);
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
    }
  }
}

export function parseBiExport(
  layout: BiLayout,
  bytes: Uint8Array,
): MacroParseResult {
  return attempt(() => {
    const { series, header } = BI_LAYOUTS[layout];
    const sheet = readXlsxWorksheet(bytes, null);
    const text = (value: string | null | undefined) =>
      value?.replace(/\s+/g, " ").trim() ?? "";
    const headerRow = sheet.rows.find(
      (row) =>
        text(row.cells.find((c) => c.column === 1)?.value).toLowerCase() ===
        "no",
    );
    if (!headerRow) throw new LayoutError("no header row starting with NO");
    const labels = [1, 2, 3].map((column) =>
      text(
        headerRow.cells.find((c) => c.column === column)?.value,
      ).toLowerCase(),
    );
    if (labels.join("|") !== header.join("|")) {
      throw new LayoutError(
        `header is ${labels.join(", ")}; expected ${header.join(", ")}`,
      );
    }
    const observations: Observation[] = [];
    for (const row of sheet.rows) {
      if (row.rowNumber <= headerRow.rowNumber) continue;
      const cell = (column: number) =>
        text(row.cells.find((c) => c.column === column)?.value);
      if (row.cells.every((c) => text(c.value) === "")) continue;
      const where = `row ${row.rowNumber}`;
      if (!/^\d+$/.test(cell(1)))
        throw new LayoutError(`${where}: "${cell(1)}" is not a row number`);
      if (row.cells.some((c) => c.column > 3 && text(c.value) !== "")) {
        throw new LayoutError(`${where}: a value past the third column`);
      }
      observations.push({
        period: biPeriod(layout, cell(2), where),
        value: indonesianNumber(cell(3), where),
      });
    }
    if (observations.length === 0)
      throw new LayoutError("no rows under the header");
    return new Map([[series, sorted(observations, series)]]);
  });
}

/** The Pink Sheet columns Sigi reads, with the unit each must carry. */
export const PINK_SHEET_COLUMNS = {
  brent: { label: "Crude oil, Brent", unit: "($/bbl)" },
  coal: { label: "Coal, Australian", unit: "($/mt)" },
  "palm-oil": { label: "Palm oil", unit: "($/mt)" },
  nickel: { label: "Nickel", unit: "($/mt)" },
  tin: { label: "Tin", unit: "($/mt)" },
  gold: { label: "Gold", unit: "($/troy oz)" },
} as const satisfies Partial<Record<SeriesId, { label: string; unit: string }>>;

/** The World Bank's monthly workbook, sheet "Monthly Prices" (S7). */
export function parsePinkSheet(bytes: Uint8Array): MacroParseResult {
  return attempt(() => {
    const sheet = readXlsxWorksheet(bytes, "Monthly Prices");
    const label = (value: string | null | undefined) =>
      (value ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
    const headerIndex = sheet.rows.findIndex((row) =>
      row.cells.some((c) => label(c.value) === PINK_SHEET_COLUMNS.brent.label),
    );
    if (headerIndex < 0)
      throw new LayoutError("no header row naming Crude oil, Brent");
    const header = sheet.rows[headerIndex];
    const units = sheet.rows[headerIndex + 1];
    const result = new Map<SeriesId, Observation[]>();
    for (const [id, column] of Object.entries(PINK_SHEET_COLUMNS) as [
      keyof typeof PINK_SHEET_COLUMNS,
      (typeof PINK_SHEET_COLUMNS)[keyof typeof PINK_SHEET_COLUMNS],
    ][]) {
      const matches = header.cells.filter(
        (c) => label(c.value) === column.label,
      );
      if (matches.length !== 1) {
        throw new LayoutError(
          `${matches.length} columns named "${column.label}"`,
        );
      }
      const index = matches[0].column;
      const unit = label(units?.cells.find((c) => c.column === index)?.value);
      if (unit !== column.unit) {
        throw new LayoutError(
          `"${column.label}" is in ${unit || "no unit"}; expected ${column.unit}`,
        );
      }
      const observations: Observation[] = [];
      for (const row of sheet.rows.slice(headerIndex + 2)) {
        const period = label(row.cells.find((c) => c.column === 1)?.value);
        const match = /^(\d{4})M(\d{2})$/.exec(period);
        if (!match) {
          if (period === "") continue;
          throw new LayoutError(
            `row ${row.rowNumber}: period "${period}" is not YYYYMmm`,
          );
        }
        const raw = label(row.cells.find((c) => c.column === index)?.value);
        // "…" marks a month with no price.
        if (raw === "" || raw === "…" || raw === "...") continue;
        if (!/^-?\d+(\.\d+)?(E-?\d+)?$/i.test(raw)) {
          throw new LayoutError(
            `row ${row.rowNumber}: ${column.label} "${raw}" is not a number`,
          );
        }
        // Excel stores 135.2 as 135.19999999999999; six decimals is far
        // beyond what the World Bank publishes.
        observations.push({
          period: `${match[1]}-${match[2]}`,
          value: Math.round(Number(raw) * 1e6) / 1e6,
        });
      }
      result.set(id, sorted(observations, id));
    }
    return result;
  });
}

/**
 * The FRED series Sigi reads, by FRED ID (S8). Each is fetched as its own
 * CSV: asking FRED for several at once returns a ZIP grouped by frequency.
 */
export const FRED_SERIES = {
  DFEDTARU: "fed-funds",
  DGS10: "us-10y",
  DTWEXBGS: "usd-broad",
} as const satisfies Record<string, SeriesId>;
export type FredId = keyof typeof FRED_SERIES;

/** FRED's graph CSV for one series: `observation_date,<ID>`. */
export function parseFredCsv(
  fredId: FredId,
  bytes: Uint8Array,
): MacroParseResult {
  return attempt(() => {
    const lines = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");
    if (lines[0] !== `observation_date,${fredId}`) {
      throw new LayoutError(
        `header is "${lines[0] ?? ""}"; expected "observation_date,${fredId}"`,
      );
    }
    const observations: Observation[] = [];
    for (const [index, line] of lines.slice(1).entries()) {
      const where = `line ${index + 2}`;
      const [date, raw, ...rest] = line.split(",");
      if (rest.length > 0 || raw === undefined)
        throw new LayoutError(`${where}: not two fields`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new LayoutError(`${where}: date "${date}" is not YYYY-MM-DD`);
      }
      // FRED leaves a day with no observation empty (or ".").
      if (raw === "" || raw === ".") continue;
      if (!/^-?\d+(\.\d+)?$/.test(raw))
        throw new LayoutError(`${where}: "${raw}" is not a number`);
      observations.push({ period: date, value: Number(raw) });
    }
    const series = FRED_SERIES[fredId];
    return new Map([[series, sorted(observations, series)]]);
  });
}
