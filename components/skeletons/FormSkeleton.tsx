import { Skeleton } from "@/components/ui/Skeleton";

export function FormSkeleton({
  sections = 3,
  fieldsPerSection = 4,
}: {
  sections?: number;
  fieldsPerSection?: number;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        {Array.from({ length: sections }).map((_, s) => (
          <div
            key={s}
            className="border-border flex flex-col gap-4 border-b pb-6 last:border-b-0 last:pb-0"
          >
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: fieldsPerSection }).map((_, f) => (
                <div key={f} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
