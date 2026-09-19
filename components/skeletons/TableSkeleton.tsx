import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export function TableSkeleton({
  rows = 8,
  columns = 6,
  withFilters = false,
}: {
  rows?: number;
  columns?: number;
  withFilters?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {withFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 flex-1 sm:max-w-sm" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      )}
      <div className="border-border overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border flex gap-4 border-b p-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-4 flex-1", i === 0 && "max-w-16")}
            />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="border-border flex items-center gap-4 border-b p-4 last:border-0"
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("h-4 flex-1", i === 0 && "max-w-16")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
