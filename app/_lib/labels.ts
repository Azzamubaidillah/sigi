import { TRANCHES, type Tranche } from "@/src/investability/rule";
import { INVESTOR_TYPE_LABELS, type InvestorType } from "@/src/ownership/gates";

export function typeLabel(type: string | null): string {
  if (type === null) return "Unclassified (scrip)";
  return INVESTOR_TYPE_LABELS[type as InvestorType] ?? type;
}

export function localForeignLabel(value: string | null): string {
  return value === "L" ? "Local" : value === "A" ? "Foreign" : "Unclassified";
}

/** "12.5% by 2027-03-31, 15% by 2028-03-31" for one tranche. */
export function trancheDeadlines(tranche: Tranche): string {
  return TRANCHES[tranche].deadlines
    .map(
      (deadline) => `${deadline.requiredHundredths / 100}% by ${deadline.date}`,
    )
    .join(", ");
}

/** "If Rp5T or more: 12.5% by 2027-03-31, 15% by 2028-03-31" per tranche. */
export function possibleDeadlines(tranches: readonly Tranche[]): string[] {
  return tranches.map(
    (tranche) => `${TRANCHES[tranche].short}: ${trancheDeadlines(tranche)}`,
  );
}
