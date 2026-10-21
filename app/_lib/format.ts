const shares = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const hhi = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const timestampFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Hundredths of a percent, exactly as published: 4110 → "41.10%". */
export function formatPercent(hundredths: number): string {
  const sign = hundredths < 0 ? "−" : "";
  const value = Math.abs(hundredths);
  return `${sign}${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}%`;
}

/** A change in hundredths of a percent, signed: 120 → "+1.20 pp". */
export function formatPercentChange(hundredths: number): string {
  if (hundredths === 0) return "0.00 pp";
  const sign = hundredths > 0 ? "+" : "−";
  const value = Math.abs(hundredths);
  return `${sign}${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")} pp`;
}

export function formatShares(value: number): string {
  return shares.format(value);
}

export function formatSharesChange(value: number): string {
  return value > 0
    ? `+${shares.format(value)}`
    : value < 0
      ? `−${shares.format(-value)}`
      : "0";
}

export function formatHhi(value: number): string {
  return hhi.format(value);
}

/** "2026-02-27" → "27 Feb 2026" */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-10" → "October 2026" */
export function formatMonth(isoMonth: string): string {
  return monthFormat.format(new Date(`${isoMonth}-01T00:00:00Z`));
}

/** Epoch ms, in Jakarta time: "1 Oct 2026, 14:03 WIB". */
export function formatTimestamp(epochMs: number): string {
  return `${timestampFormat.format(new Date(epochMs))} WIB`;
}
