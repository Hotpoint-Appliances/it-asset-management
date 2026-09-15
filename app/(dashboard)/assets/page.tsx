import { requireSession } from "@/lib/auth/session";
import { listAssets } from "@/lib/db/assets";
import { listCategories } from "@/lib/db/categories";
import { listLocations } from "@/lib/db/locations";
import { listDepartments } from "@/lib/db/departments";
import { listAssetConditions } from "@/lib/db/assetConditions";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { AssetsList } from "@/components/assets/AssetsList";
import type { AssetFilters } from "@/types/asset";

const PAGE_SIZE = 25;

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

  const filters: AssetFilters = {
    statusIds: toIds(params.statusId),
    categoryIds: toIds(params.categoryId),
    departmentIds: toIds(params.departmentId),
    locationIds: toIds(params.locationId),
    conditionIds: toIds(params.conditionId),
    search:
      typeof params.search === "string" && params.search ? params.search : null,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
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

  return (
    <AssetsList
      assets={assetsResult.items}
      total={assetsResult.total}
      page={page}
      pageSize={PAGE_SIZE}
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
