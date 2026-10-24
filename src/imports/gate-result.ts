/**
 * What an import gate found, for every source. "fail" rejects the file and
 * keeps what was published before. "warn" publishes it with the finding shown
 * on the data page: nobody reviews imports, so a finding either blocks or is
 * disclosed (D-021).
 */
export type GateVerdict = "pass" | "warn" | "fail";

export interface GateResult {
  gate: string;
  verdict: GateVerdict;
  detail: string;
}

export function outcomeOf(
  results: readonly GateResult[],
): "rejected" | "published" {
  return results.some((result) => result.verdict === "fail")
    ? "rejected"
    : "published";
}
