/** Assets-list page size, chosen from a fixed set via `?pageSize=`. Pure: the client list imports
 * the options too. A whitelist rather than any positive integer, so a hand-edited URL can't ask
 * the list query for the whole register in one page (the export is the route for that). */

export const ASSET_PAGE_SIZES = [10, 25, 50, 100] as const;

export const DEFAULT_ASSET_PAGE_SIZE = 25;

/** The default for a missing or unlisted value. */
export function parseAssetPageSize(value: string | null | undefined): number {
  const n = Number(value);
  return (ASSET_PAGE_SIZES as readonly number[]).includes(n)
    ? n
    : DEFAULT_ASSET_PAGE_SIZE;
}
