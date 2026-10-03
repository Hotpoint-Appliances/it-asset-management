import type { ExportFilters, AuditExportFilters } from "@/lib/db/reports";
import { parseAssetSort } from "@/lib/assetSort";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ids(params: URLSearchParams, key: string): number[] {
  return params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map(Number)
    .filter((n) => Number.isInteger(n));
}

/** The asset register export accepts the *same* query string the assets list page uses
 * (statusId / categoryId / departmentId / locationId / conditionId, comma-separated or repeated,
 * plus `search`, and `sort`/`dir`), so the list page's Export button just forwards its current URL
 * params and the workbook rows come out in the order the list shows. */
export function parseAssetRegisterParams(
  params: URLSearchParams,
): ExportFilters {
  const search = params.get("search");
  return {
    statusIds: ids(params, "statusId"),
    categoryIds: ids(params, "categoryId"),
    departmentIds: ids(params, "departmentId"),
    locationIds: ids(params, "locationId"),
    conditionIds: ids(params, "conditionId"),
    search: search ? search : null,
    sort: parseAssetSort(params.get("sort"), params.get("dir")),
  };
}

function isRealDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

export function parseAuditTrailParams(
  params: URLSearchParams,
): Result<AuditExportFilters> {
  const assetId = params.get("assetId") || null;
  const from = params.get("from") || null;
  const to = params.get("to") || null;
  if (assetId && !UUID.test(assetId)) {
    return { success: false, error: "assetId must be a valid asset id" };
  }
  if (from && !isRealDate(from)) {
    return { success: false, error: "from must be a date (YYYY-MM-DD)" };
  }
  if (to && !isRealDate(to)) {
    return { success: false, error: "to must be a date (YYYY-MM-DD)" };
  }
  if (from && to && from > to) {
    return { success: false, error: "from must not be after to" };
  }
  return { success: true, data: { assetId, from, to } };
}
