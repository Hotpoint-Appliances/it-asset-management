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

/** Company timezone. Timestamps always display in it, so the server and browser render the same
 * text (no hydration mismatch) and everyone reads the same time on an audit entry. */
const DISPLAY_TIME_ZONE = "Africa/Nairobi";

const DATE_ONLY = /^d{4}-d{2}-d{2}$/;

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/** The named parts of a date, for assembling the app's format by hand: locale patterns vary by
 * ICU version (en-GB's September can be "Sept"), so en-US only supplies the pieces. */
function dateParts(date: Date, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
  return (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
}

/** "5 Nov 2026". A date-only value ("YYYY-MM-DD", see lib/db/dates.ts) is a calendar date and is
 * shown as written, never shifted by a timezone; a full timestamp shows its Nairobi date. */
export function formatDate(value: string): string {
  const dateOnly = DATE_ONLY.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  const part = dateParts(date, {
    ...DATE_PARTS,
    timeZone: dateOnly ? "UTC" : DISPLAY_TIME_ZONE,
  });
  return `${part("day")} ${part("month")} ${part("year")}`;
}

/** "5 Nov 2026, 14:32", 24-hour Nairobi time, for values where the time of day matters. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const part = dateParts(date, {
    ...DATE_PARTS,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: DISPLAY_TIME_ZONE,
  });
  return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}:${part("minute")}`;
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
  if (abs > 30 * 86_400) return formatDate(iso);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}
