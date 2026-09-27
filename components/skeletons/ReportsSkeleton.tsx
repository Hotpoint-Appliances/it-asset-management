import type { LucideIcon } from "lucide-react";
import { ClipboardList, ScrollText, Trash2, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";

/** Mirrors app/(dashboard)/reports/page.tsx with the admin / asset_manager card set; viewers
 * see two of the four cards once the page resolves. */
export function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Reports"
        description="Excel exports for finance and audit."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCardSkeleton icon={ClipboardList} title="Asset register" />
        <ReportCardSkeleton
          icon={ScrollText}
          title="Audit trail"
          withDateRange
        />
        <ReportCardSkeleton icon={Trash2} title="Disposal register" />
        <ReportCardSkeleton icon={TrendingDown} title="Depreciation summary" />
      </div>
    </div>
  );
}

function ReportCardSkeleton({
  icon: Icon,
  title,
  withDateRange = false,
}: {
  icon: LucideIcon;
  title: string;
  withDateRange?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex flex-col gap-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4 pt-0">
        {withDateRange && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {["From", "To"].map((label) => (
              <div key={label} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{label}</span>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        )}
        <Skeleton className="h-10 w-40" />
      </CardContent>
    </Card>
  );
}
