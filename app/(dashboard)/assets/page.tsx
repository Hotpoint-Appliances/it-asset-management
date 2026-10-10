import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { listAssets } from "@/lib/db/assets";
import { listCategories } from "@/lib/db/categories";
import { listLocations } from "@/lib/db/locations";
import { listDepartments } from "@/lib/db/departments";
import { listAssetConditions } from "@/lib/db/assetConditions";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { AssetsList } from "@/components/assets/AssetsList";
import type { AssetFilters } from "@/types/asset";
import { parseAssetSort } from "@/lib/assetSort";
import { parseAssetPageSize } from "@/lib/assetPageSize";

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toIds(value: string | string[] | undefined): number[] {
  return toArray(value)
    .flatMap((v) => v.split(","))
    .map(Number)
    .filter((n) => Number.isInteger(n));
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = parseAssetPageSize(
    typeof params.pageSize === "string" ? params.pageSize : null,
  );
  const sort = parseAssetSort(
    typeof params.sort === "string" ? params.sort : null,
    typeof params.dir === "string" ? params.dir : null,
  );

  const filters: AssetFilters = {
    statusIds: toIds(params.statusId),
    categoryIds: toIds(params.categoryId),
    departmentIds: toIds(params.departmentId),
    locationIds: toIds(params.locationId),
    conditionIds: toIds(params.conditionId),
    search:
      typeof params.search === "string" && params.search ? params.search : null,
    sort,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  const [
    assetsResult,
    categories,
    locations,
    departments,
    conditions,
    statuses,
  ] = await Promise.all([
    listAssets(filters, session),
    listCategories(),
    listLocations(),
    listDepartments(500, 0),
    listAssetConditions(),
    listAssetStatuses(),
  ]);

  // A page past the end (a stale link, or a bookmark after assets were removed) would otherwise
  // render "No assets found" despite matches existing; send it to the last page instead.
  if (assetsResult.items.length === 0 && assetsResult.total > 0) {
    const lastPage = Math.ceil(assetsResult.total / pageSize);
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== "page") toArray(value).forEach((v) => query.append(key, v));
    }
    if (lastPage > 1) query.set("page", String(lastPage));
    const qs = query.toString();
    redirect(qs ? `/assets?${qs}` : "/assets");
  }

  return (
    <AssetsList
      assets={assetsResult.items}
      total={assetsResult.total}
      page={page}
      sort={sort}
      pageSize={pageSize}
      canManage={
        session.roleName === "admin" || session.roleName === "asset_manager"
      }
      categories={categories}
      locations={locations}
      departments={departments.items}
      conditions={conditions}
      statuses={statuses}
    />
  );
}
