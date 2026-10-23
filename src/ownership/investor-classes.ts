/**
 * Investor types as the register publishes them. Until March 2026 column E
 * held KSEI's nine codes; from April 2026 it holds about thirty
 * classification labels, spelled with varying case and spacing. Both are
 * stored as published; this module says what each means for Sigi.
 */

/** KSEI's codes in the files up to 2026-03-31. */
export const KSEI_CODES: Record<string, string> = {
  IS: "Insurance",
  CP: "Corporate",
  PF: "Pension fund",
  IB: "Financial institution",
  ID: "Individual",
  MF: "Mutual fund",
  SC: "Securities company",
  FD: "Foundation",
  OT: "Other",
};

/** A label reduced to letters, so "Sole proprietorship" and "Sole Proprietorship" agree. */
export function classKey(type: string): string {
  return type.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Labels seen since April 2026 that are never a natural person, in the
 * spelling Sigi shows. "Sole proprietorship" is deliberately absent: it is one
 * person's business, and is treated as an individual (PRD C6).
 */
const INSTITUTIONAL_LABELS = [
  "Corporate",
  "Mutual Funds",
  "Securities Company",
  "Private Bank",
  "Investment Advisors",
  "Private Equity",
  "Firm",
  "Insurance",
  "Bank",
  "State Owned Enterprises",
  "Investment Manager",
  "Venture Capital",
  "Pension Funds",
  "Partnership",
  "Trustee Bank",
  "Sovereign Wealth Fund",
  "Government",
  "Financial Institutional",
  "Hedge Fund",
  "Cooperatives",
  "Exchange Traded Funds",
  "Investment Fund Selling Agent",
  "Brokerage Firms",
  "Permanent Establishment",
  "Commanditaire Vennootschap (CV) Or Limited Partnership",
  "Capital Market Supporting Institutions And Professions",
  "Foundation",
  "State Owned Company",
  "Peer To Peer Lending",
  "International Organization",
  "Educational Institution",
  "Diocese",
  "Association/Social Organizations",
];
const INDIVIDUAL_LABELS = ["Individual", "Sole Proprietorship"];
const INSTITUTIONAL = new Set(INSTITUTIONAL_LABELS.map(classKey));
const INDIVIDUAL = new Set(INDIVIDUAL_LABELS.map(classKey));
const INSTITUTIONAL_CODES = new Set([
  "IS",
  "CP",
  "PF",
  "IB",
  "MF",
  "SC",
  "FD",
  "OT",
]);
/** One spelling per known label, whatever case and spacing a file used. */
const CANONICAL = new Map(
  [...INSTITUTIONAL_LABELS, ...INDIVIDUAL_LABELS].map((label) => [
    classKey(label),
    label,
  ]),
);

export type HolderKind =
  "individual" | "institution" | "unclassified" | "unknown";

/** What a published type means; an unrecognised label is "unknown", never assumed institutional. */
export function holderKind(type: string | null): HolderKind {
  if (type === null) return "unclassified";
  if (type === "ID") return "individual";
  if (INSTITUTIONAL_CODES.has(type)) return "institution";
  const key = classKey(type);
  if (INDIVIDUAL.has(key)) return "individual";
  if (INSTITUTIONAL.has(key)) return "institution";
  return "unknown";
}

/** A display label: codes spelled out, known labels in one spelling, others as published. */
export function typeLabel(type: string | null): string {
  if (type === null) return "Unclassified";
  return KSEI_CODES[type] ?? CANONICAL.get(classKey(type)) ?? type.trim();
}
