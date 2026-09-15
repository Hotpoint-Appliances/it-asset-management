import { Skeleton } from "@/components/ui/Skeleton";

export function PageHeaderSkeleton({
  withAction = true,
}: {
  withAction?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      {withAction && <Skeleton className="h-10 w-28" />}
    </div>
  );
}
