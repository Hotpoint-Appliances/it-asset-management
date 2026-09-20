import { query } from "./query";

export const WARRANTY_WINDOWS_KEY = "warranty_expiry_windows_days";
export const DEFAULT_WARRANTY_WINDOWS = [30, 60, 90];

export async function getSetting(key: string): Promise<string | null> {
  const result = await query<{ value: string | null }>(
    `SELECT value FROM system_settings WHERE key = $1`,
    [key],
  );
  return result.rows[0]?.value ?? null;
}

/** Warranty-expiry look-ahead windows (days) for the dashboard widget (phase-6: "30/60/90,
 * configurable via `system_settings`"). Stored as a comma-separated list under
 * `warranty_expiry_windows_days`; there's no admin UI for settings yet, so a missing row or an
 * unparseable value falls back to 30/60/90 instead of breaking the dashboard. Returned sorted
 * ascending, de-duplicated, capped at 3 windows / 365 days. */
export async function getWarrantyWindows(): Promise<number[]> {
  const raw = await getSetting(WARRANTY_WINDOWS_KEY);
  if (!raw) return DEFAULT_WARRANTY_WINDOWS;
  const parsed = [
    ...new Set(
      raw
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n) && n > 0 && n <= 365),
    ),
  ]
    .sort((a, b) => a - b)
    .slice(0, 3);
  return parsed.length ? parsed : DEFAULT_WARRANTY_WINDOWS;
}
