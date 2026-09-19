import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton withAction={false} />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
