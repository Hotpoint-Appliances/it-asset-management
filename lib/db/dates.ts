/** `pg` parses DATE/TIMESTAMP(TZ) columns into native `Date` objects, not strings. That's
 * invisible when a mapper's output only ever flows through `NextResponse.json()` — JSON.stringify
 * calls `Date#toJSON()` and papers over it — but lib/db functions are also called directly from
 * Server Components (no JSON round-trip), where a raw `Date` reaches the client component as-is
 * and breaks anything expecting the `string` the type declares (e.g. `.slice(0, 10)` on a date
 * input's default value). Every lib/db mapper must normalize date/timestamp columns through this
 * before returning, regardless of call path. */
export function toIsoString(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** For pure DATE columns (purchase_date, warranty_expiry, ...) — no time-of-day, so unlike
 * `toIsoString()` this must NOT round-trip through UTC. `pg` constructs a DATE's `Date` object
 * at **local** midnight (`new Date(year, month, day)`, not `Date.UTC(...)`) to represent that
 * exact calendar date; reading it back with UTC getters (or `toISOString().slice(0, 10)`) shifts
 * the day whenever the server's local offset isn't 0 (e.g. Africa/Nairobi, UTC+3, turns Jan 15
 * local midnight into "2024-01-14T21:00:00.000Z"). Local getters undo exactly the construction
 * pg did, so they're the correct read here regardless of server timezone. */
export function toDateOnlyString(value: unknown): string | null {
  if (value == null) return null;
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
