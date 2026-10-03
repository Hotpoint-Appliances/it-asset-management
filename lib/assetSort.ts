/** Assets-list column sorting (phase-8), shared by the list page, GET /api/assets and the asset
 * register export so all three accept the same `?sort=&dir=` query string. Pure: the client list
 * imports the keys too. The SQL for each key lives in lib/db/assets.ts (a whitelist; the raw
 * param never reaches SQL). */

export const ASSET_SORT_KEYS = [
  "tag",
  "name",
  "category",
  "status",
  "condition",
  "location",
  "department",
  "owner",
  "updated",
] as const;

export type AssetSortKey = (typeof ASSET_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

export interface AssetSort {
  key: AssetSortKey;
  dir: SortDirection;
}

function isSortKey(value: string): value is AssetSortKey {
  return (ASSET_SORT_KEYS as readonly string[]).includes(value);
}

/** null for a missing/unknown key, so callers fall back to their default order. An unknown
 * `dir` defaults to ascending. */
export function parseAssetSort(
  sort: string | null | undefined,
  dir: string | null | undefined,
): AssetSort | null {
  if (!sort || !isSortKey(sort)) return null;
  return { key: sort, dir: dir === "desc" ? "desc" : "asc" };
}
