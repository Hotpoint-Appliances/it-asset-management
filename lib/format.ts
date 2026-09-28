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
