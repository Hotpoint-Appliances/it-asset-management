"use client";

import { useAssetColumns } from "@/lib/hooks/useAssetColumns";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";
import { TableSkeleton } from "./TableSkeleton";

// Widths follow each MultiSelectFilter's label: Status, Category, Department, Location, Condition.
const FILTER_WIDTHS = ["w-24", "w-28", "w-32", "w-28", "w-28"];

/** Mirrors components/assets/AssetsList.tsx: header with Export / New Asset, search row,
 * filter pills, the asset table and pagination. */
export function AssetsListSkeleton() {
  const { isVisible } = useAssetColumns();

  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton
        title="Assets"
        actions={
          <>
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_WIDTHS.map((width, i) => (
            <Skeleton key={i} className={cn("h-9", width)} />
          ))}
          <Skeleton className="ml-auto h-9 w-28" />
        </div>
      </div>

      <TableSkeleton
        rows={10}
        columns={[
          { header: "Tag", cell: "mono" },
          { header: "Name" },
          ...(isVisible("serial")
            ? [{ header: "Serial number", cell: "mono" as const }]
            : []),
          ...(isVisible("category") ? [{ header: "Category" }] : []),
          ...(isVisible("status")
            ? [{ header: "Status", cell: "badge" as const }]
            : []),
          ...(isVisible("condition")
            ? [{ header: "Condition", cell: "badge" as const }]
            : []),
          ...(isVisible("location") ? [{ header: "Location" }] : []),
          ...(isVisible("department") ? [{ header: "Department" }] : []),
          ...(isVisible("owner") ? [{ header: "Owner" }] : []),
          ...(isVisible("email") ? [{ header: "Owner email" }] : []),
          { header: "Actions", cell: "actions", sticky: true },
        ]}
      />

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  );
}
