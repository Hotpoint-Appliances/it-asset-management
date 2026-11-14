"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  stickyEndHeadClass,
  stickyEndCellClass,
} from "@/components/ui/Table";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MultiSelectFilter } from "@/components/shared/MultiSelectFilter";
import { SortableHead } from "@/components/shared/SortableHead";
import { AssetColumnsMenu } from "./AssetColumnsMenu";
import { AssetRowActions } from "./AssetRowActions";
import { useAssetColumns } from "@/lib/hooks/useAssetColumns";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { cn } from "@/lib/utils";
import {
  statusBadgeVariant,
  conditionBadgeVariant,
  formatLookupName,
} from "@/lib/badgeVariants";
import type { AssetListItem } from "@/types/asset";
import type { AssetSort, AssetSortKey } from "@/lib/assetSort";
import { ASSET_PAGE_SIZES, DEFAULT_ASSET_PAGE_SIZE } from "@/lib/assetPageSize";
import type { Category } from "@/types/category";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";
import type { AssetCondition } from "@/types/assetCondition";
import type { AssetStatus } from "@/types/assetStatus";

interface AssetsListProps {
  assets: AssetListItem[];
  total: number;
  page: number;
  /** The active column sort parsed from the URL, null = default order (newest first). */
  sort: AssetSort | null;
  pageSize: number;
  canManage: boolean;
  categories: Category[];
  locations: Location[];
  departments: Department[];
  conditions: AssetCondition[];
  statuses: AssetStatus[];
}

const FILTER_KEYS = [
  "statusId",
  "categoryId",
  "departmentId",
  "locationId",
  "conditionId",
] as const;

export function AssetsList({
  assets,
  total,
  page,
  sort,
  pageSize,
  canManage,
  categories,
  locations,
  departments,
  conditions,
  statuses,
}: AssetsListProps) {
  const router = useRouteLoadingRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = React.useState(urlSearch);
  // Back/forward and links change the URL without remounting this page, so the box follows it.
  const [prevUrlSearch, setPrevUrlSearch] = React.useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearch(urlSearch);
  }
  const columns = useAssetColumns();
  const { isVisible } = columns;

  function currentValues(key: string): string[] {
    return searchParams.getAll(key);
  }

  function pushParams(params: URLSearchParams) {
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setMulti(key: string, values: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    values.forEach((v) => params.append(key, v));
    pushParams(params);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    pushParams(params);
  }

  function clearFilters() {
    setSearch("");
    // Clearing filters keeps the chosen sort and page size; only filters/search/page are dropped.
    const params = new URLSearchParams();
    if (sort) {
      params.set("sort", sort.key);
      params.set("dir", sort.dir);
    }
    const pageSizeParam = searchParams.get("pageSize");
    if (pageSizeParam) params.set("pageSize", pageSizeParam);
    pushParams(params);
  }

  /** asc -> desc -> back to the default order, per column; a new column starts at asc. Sorting
   * resets to page 1 (pushParams drops `page`). */
  function toggleSort(key: AssetSortKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort?.key !== key) {
      params.set("sort", key);
      params.set("dir", "asc");
    } else if (sort.dir === "asc") {
      params.set("dir", "desc");
    } else {
      params.delete("sort");
      params.delete("dir");
    }
    pushParams(params);
  }

  function sortableHead(key: AssetSortKey, label: string) {
    return (
      <SortableHead
        label={label}
        direction={sort?.key === key ? sort.dir : null}
        onSort={() => toggleSort(key)}
      />
    );
  }

  const hasFilters =
    FILTER_KEYS.some((key) => currentValues(key).length > 0) ||
    !!searchParams.get("search");

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  /** Lands on the page holding the current first row, so a resize keeps your place (rows 51-75
   * at 25 -> page 2 at 50). The default size and page 1 are left out of the URL. */
  function changePageSize(nextSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSize === DEFAULT_ASSET_PAGE_SIZE) params.delete("pageSize");
    else params.set("pageSize", String(nextSize));
    const nextPage = Math.floor(((page - 1) * pageSize) / nextSize) + 1;
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // The register export takes the same filter params as this page (minus pagination), so what
  // downloads is exactly the filtered set on screen, all pages of it.
  const exportParams = new URLSearchParams(searchParams.toString());
  exportParams.delete("page");
  exportParams.delete("pageSize");
  const exportHref = `/api/reports/asset-register${exportParams.size ? `?${exportParams.toString()}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-muted-foreground text-sm">
            {total} asset{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <DownloadButton href={exportHref} variant="outline">
            Export
          </DownloadButton>
          {canManage && (
            <Button variant="outline" asChild>
              <Link href="/assets/import" aria-label="Import assets">
                <UploadSimpleIcon weight="bold" className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Link>
            </Button>
          )}
          {canManage && (
            <Button asChild>
              <Link href="/assets/new">
                <PlusIcon weight="bold" className="h-4 w-4" />
                New Asset
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              weight="bold"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tag, name, serial number, owner or email…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="Status"
            options={statuses.map((s) => ({
              value: String(s.id),
              label: formatLookupName(s.name),
            }))}
            selected={currentValues("statusId")}
            onChange={(v) => setMulti("statusId", v)}
          />
          <MultiSelectFilter
            label="Category"
            options={categories.map((c) => ({
              value: String(c.id),
              label: c.name,
            }))}
            selected={currentValues("categoryId")}
            onChange={(v) => setMulti("categoryId", v)}
          />
          <MultiSelectFilter
            label="Department"
            options={departments.map((d) => ({
              value: String(d.id),
              label: d.name,
            }))}
            selected={currentValues("departmentId")}
            onChange={(v) => setMulti("departmentId", v)}
          />
          <MultiSelectFilter
            label="Location"
            options={locations.map((l) => ({
              value: String(l.id),
              label: l.name,
            }))}
            selected={currentValues("locationId")}
            onChange={(v) => setMulti("locationId", v)}
          />
          <MultiSelectFilter
            label="Condition"
            options={conditions.map((c) => ({
              value: String(c.id),
              label: formatLookupName(c.name),
            }))}
            selected={currentValues("conditionId")}
            onChange={(v) => setMulti("conditionId", v)}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1"
            >
              <XIcon weight="bold" className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
          <AssetColumnsMenu columns={columns} />
        </div>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No assets found"
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "Create the first asset to get started."
          }
          action={
            canManage && !hasFilters ? (
              <Button asChild>
                <Link href="/assets/new">New Asset</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table
            className={cn(
              "transition-opacity",
              router.isPending && "pointer-events-none opacity-60",
            )}
          >
            <TableHeader>
              <TableRow>
                {sortableHead("tag", "Tag")}
                {sortableHead("name", "Name")}
                {isVisible("serial") && sortableHead("serial", "Serial number")}
                {isVisible("category") && sortableHead("category", "Category")}
                {isVisible("status") && sortableHead("status", "Status")}
                {isVisible("condition") &&
                  sortableHead("condition", "Condition")}
                {isVisible("location") && sortableHead("location", "Location")}
                {isVisible("department") &&
                  sortableHead("department", "Department")}
                {isVisible("owner") && sortableHead("owner", "Owner")}
                {isVisible("email") && sortableHead("email", "Owner email")}
                <TableHead className={cn(stickyEndHeadClass, "text-center")}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                // The whole row links to the asset via a stretched `::after` on the name link
                // (a real anchor, so ctrl/middle-click, prefetch and keyboard focus all work),
                // not a row onClick, which would also fire for clicks inside the actions menu's
                // portaled dialogs since React bubbles events through portals.
                <TableRow key={asset.id} className="group/row relative">
                  <TableCell className="font-mono text-xs font-medium">
                    {asset.assetTag}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="focus-visible:after:ring-ring after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset"
                    >
                      {asset.name}
                    </Link>
                  </TableCell>
                  {isVisible("serial") && (
                    <TableCell className="font-mono text-xs">
                      {asset.serialNumber}
                    </TableCell>
                  )}
                  {isVisible("category") && (
                    <TableCell>{asset.categoryName}</TableCell>
                  )}
                  {isVisible("status") && (
                    <TableCell>
                      <Badge variant={statusBadgeVariant(asset.statusName)}>
                        {formatLookupName(asset.statusName)}
                      </Badge>
                    </TableCell>
                  )}
                  {isVisible("condition") && (
                    <TableCell>
                      <Badge
                        variant={conditionBadgeVariant(asset.conditionName)}
                      >
                        {formatLookupName(asset.conditionName)}
                      </Badge>
                    </TableCell>
                  )}
                  {isVisible("location") && (
                    <TableCell>{asset.locationName}</TableCell>
                  )}
                  {isVisible("department") && (
                    <TableCell>{asset.departmentName}</TableCell>
                  )}
                  {isVisible("owner") && (
                    <TableCell>
                      {asset.assignedUserName ?? asset.ownerName ?? "N/A"}
                    </TableCell>
                  )}
                  {isVisible("email") && (
                    <TableCell>
                      {asset.assignedUserEmail ?? asset.ownerEmail ?? "N/A"}
                    </TableCell>
                  )}
                  <TableCell className={cn(stickyEndCellClass, "text-center")}>
                    <AssetRowActions
                      asset={asset}
                      canManage={canManage}
                      locations={locations}
                      departments={departments}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Wraps on narrow phones: row range + size on one line, Previous/Next pushed right on
              the next (ml-auto keeps them right-aligned once they wrap). */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground text-sm whitespace-nowrap">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-sm whitespace-nowrap"
                >
                  Rows per page
                </span>
                <Select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => changePageSize(Number(e.target.value))}
                  side="top"
                  disabled={router.isPending}
                  className="h-9 w-20"
                >
                  {ASSET_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
