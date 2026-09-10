"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Search, X, Boxes, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { MultiSelectFilter } from "@/components/shared/MultiSelectFilter";
import { statusBadgeVariant, conditionBadgeVariant, formatLookupName } from "@/lib/badgeVariants";
import type { AssetListItem } from "@/types/asset";
import type { Category } from "@/types/category";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";
import type { AssetCondition } from "@/types/assetCondition";
import type { AssetStatus } from "@/types/assetStatus";

interface AssetsListProps {
  assets: AssetListItem[];
  total: number;
  page: number;
  pageSize: number;
  canManage: boolean;
  categories: Category[];
  locations: Location[];
  departments: Department[];
  conditions: AssetCondition[];
  statuses: AssetStatus[];
}

const FILTER_KEYS = ["statusId", "categoryId", "departmentId", "locationId", "conditionId"] as const;

export function AssetsList({
  assets,
  total,
  page,
  pageSize,
  canManage,
  categories,
  locations,
  departments,
  conditions,
  statuses,
}: AssetsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");

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
    router.push(pathname);
  }

  const hasFilters =
    FILTER_KEYS.some((key) => currentValues(key).length > 0) || !!searchParams.get("search");

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-muted-foreground text-sm">
            {total} asset{total === 1 ? "" : "s"}
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/assets/new">
              <Plus className="h-4 w-4" />
              New Asset
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tag, name, or serial number…"
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
            options={statuses.map((s) => ({ value: String(s.id), label: formatLookupName(s.name) }))}
            selected={currentValues("statusId")}
            onChange={(v) => setMulti("statusId", v)}
          />
          <MultiSelectFilter
            label="Category"
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            selected={currentValues("categoryId")}
            onChange={(v) => setMulti("categoryId", v)}
          />
          <MultiSelectFilter
            label="Department"
            options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
            selected={currentValues("departmentId")}
            onChange={(v) => setMulti("departmentId", v)}
          />
          <MultiSelectFilter
            label="Location"
            options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
            selected={currentValues("locationId")}
            onChange={(v) => setMulti("locationId", v)}
          />
          <MultiSelectFilter
            label="Condition"
            options={conditions.map((c) => ({ value: String(c.id), label: formatLookupName(c.name) }))}
            selected={currentValues("conditionId")}
            onChange={(v) => setMulti("conditionId", v)}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={Boxes}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-xs font-medium">{asset.assetTag}</TableCell>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.categoryName}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(asset.statusName)}>
                      {formatLookupName(asset.statusName)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={conditionBadgeVariant(asset.conditionName)}>
                      {formatLookupName(asset.conditionName)}
                    </Badge>
                  </TableCell>
                  <TableCell>{asset.locationName}</TableCell>
                  <TableCell>{asset.departmentName}</TableCell>
                  <TableCell>{asset.assignedUserName ?? asset.ownerName ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/assets/${asset.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/assets/${asset.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
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
