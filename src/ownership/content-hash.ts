import { createHash } from "node:crypto";

export interface HashableHolding {
  rowNumber: number;
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

const NULL = "\u0000";

/**
 * A digest of one month's rows in publisher order. The import stores it, and
 * the rebuild check recomputes it from the published table and from a fresh
 * parse of the landed file: all three must agree (PRD F10).
 */
export function contentHash(
  recordDate: string,
  rows: readonly HashableHolding[],
): string {
  const hash = createHash("sha256");
  hash.update(`${recordDate}\n`);
  for (const row of [...rows].sort((a, b) => a.rowNumber - b.rowNumber)) {
    hash.update(
      [
        row.rowNumber,
        row.shareCode,
        row.issuerName,
        row.investorName,
        row.investorType ?? NULL,
        row.localForeign ?? NULL,
        row.nationality ?? NULL,
        row.domicile ?? NULL,
        row.sharesScripless,
        row.sharesScrip,
        row.sharesTotal,
        row.percentHundredths,
      ].join("\u001f") + "\n",
    );
  }
  return hash.digest("hex");
}
