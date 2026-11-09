import { query } from "@/lib/db/query";
import { getSetting } from "@/lib/db/systemSettings";
import type { Hod } from "@/types/issueForm";

const CACHE_KEY = "hod_directory_cache";
const FETCH_TIMEOUT_MS = 5_000;

function parseHods(value: unknown): Hod[] | null {
  if (!Array.isArray(value)) return null;
  const hods: Hod[] = [];
  for (const item of value) {
    if (typeof item?.name !== "string" || typeof item?.email !== "string") {
      return null;
    }
    hods.push({
      name: item.name,
      email: item.email,
      department: typeof item.department === "string" ? item.department : null,
    });
  }
  return hods;
}

/** Null on any failure: unset config, the app being down, a rejected key or an unexpected body. */
async function fetchHods(): Promise<Hod[] | null> {
  const base = process.env.REQUISITIONS_API_URL?.replace(/\/+$/, "");
  const key = process.env.REQUISITIONS_API_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base}/api/staff/hods`, {
      headers: { "x-staff-lookup-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[issue-forms] HOD list request answered ${res.status}`);
      return null;
    }
    const body = await res.json();
    return parseHods(body?.hods);
  } catch (err) {
    console.error("[issue-forms] HOD list request failed", err);
    return null;
  }
}

/** The HODs from the requisitions app, or the last list it gave us when it can't be reached, so
 * an outage over there doesn't stop forms being issued here. Kept in the database so every PM2
 * worker shares it. */
export async function getHodDirectory(): Promise<{
  hods: Hod[];
  stale: boolean;
}> {
  const fresh = await fetchHods();
  if (fresh) {
    await query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ($1, $2, 'Last HOD list fetched from the requisitions app')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [CACHE_KEY, JSON.stringify(fresh)],
    );
    return { hods: fresh, stale: false };
  }
  const cached = await getSetting(CACHE_KEY);
  if (!cached) return { hods: [], stale: true };
  try {
    return { hods: parseHods(JSON.parse(cached)) ?? [], stale: true };
  } catch {
    return { hods: [], stale: true };
  }
}
