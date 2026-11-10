import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function IssueFormLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Skeleton className="my-3.5 h-4 w-36 sm:my-0.5" />
      <PageHeaderSkeleton title="Equipment issue form" />
      <Card>
        <CardContent className="flex flex-col gap-2 p-6">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
