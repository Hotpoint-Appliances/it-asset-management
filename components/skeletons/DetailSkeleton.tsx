import { Skeleton } from "@/components/ui/Skeleton";

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-6 shadow-sm sm:flex-row sm:items-start">
        <Skeleton className="h-24 w-24 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="border-border flex gap-4 border-b">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-5 w-20" />
          ))}
        </div>
        <div className="border-border bg-card grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border p-6 shadow-sm sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
