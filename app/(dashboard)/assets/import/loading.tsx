import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ImportAssetsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Import assets"
        description="Add many assets at once from an Excel file."
      />
      <div className="flex flex-col gap-4">
        {["1. Get the template", "2. Check and import"].map((title) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
              <Skeleton className="h-4 w-full max-w-lg" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
