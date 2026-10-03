/** Today's *local* calendar date as "YYYY-MM-DD". Never `new Date().toISOString().slice(0, 10)`:
 * that's the UTC date, which in Africa/Nairobi (UTC+3) is still yesterday until 03:00 (the same
 * class of bug lib/db/dates.ts documents for DATE columns). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** KES, the company is Kenya-based (hotpoint.co.ke); every money value in the schema
 * (purchase_cost, salvage_value, disposal_value, maintenance cost, ...) is denominated in it. */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-KE", { style: "currency", currency: "KES" });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "5 minutes ago" / "3 days ago" for recent-activity style lists; older than 30 days falls back
 * to a plain date. */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs > 30 * 86_400) return new Date(iso).toLocaleDateString("en-KE");
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}
