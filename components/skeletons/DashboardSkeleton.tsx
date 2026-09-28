import type { LucideIcon } from "lucide-react";
import { Boxes, CheckCircle2, Wrench, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";

/** Mirrors app/(dashboard)/(overview)/page.tsx widget for widget: stat tiles, bar breakdowns, the two list
 * cards and recent activity. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTileSkeleton label="Total assets" icon={Boxes} />
        <StatTileSkeleton label="In service" icon={CheckCircle2} />
        <StatTileSkeleton label="In repair" icon={Wrench} />
        {/* The warranty label carries the configured window, so it's data. */}
        <StatTileSkeleton icon={ShieldAlert} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarBreakdownSkeleton title="Assets by status" />
        <BarBreakdownSkeleton title="Assets by category" />
        <BarBreakdownSkeleton title="Assets by department" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListCardSkeleton title="Warranty expiring soon" rows={4} withFilter />
        <ListCardSkeleton title="Assets in repair" rows={4} />
      </div>

      <ListCardSkeleton title="Recent activity" rows={8} activity />
    </div>
  );
}

function StatTileSkeleton({
  label,
  icon: Icon,
}: {
  label?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          {label ? (
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </p>
          ) : (
            <Skeleton className="my-0.5 h-3 w-36" />
          )}
          <Skeleton className="mt-1 h-9 w-16" />
        </div>
        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const BAR_WIDTHS = ["w-[85%]", "w-[60%]", "w-[40%]", "w-[25%]", "w-[10%]"];
const NAME_WIDTHS = ["w-20", "w-24", "w-16", "w-28", "w-20"];

function BarBreakdownSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="flex flex-col gap-2.5">
          {BAR_WIDTHS.map((barWidth, i) => (
            <li
              key={i}
              className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 py-0.5"
            >
              <Skeleton className={cn("h-4", NAME_WIDTHS[i])} />
              {/* The track is the real (static) bar track; only the fill is a placeholder. */}
              <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "bg-muted-foreground/20 h-full animate-pulse rounded-full",
                    barWidth,
                  )}
                />
              </div>
              <Skeleton className="ml-auto h-4 w-6" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const PRIMARY_WIDTHS = ["w-40", "w-32", "w-48", "w-36"];
const SECONDARY_WIDTHS = ["w-56", "w-48", "w-60", "w-44"];

/** Shared shape of the warranty, in-repair and recent-activity cards: a divided list of
 * two-line rows, with a trailing badge (or a timestamp, for activity). */
function ListCardSkeleton({
  title,
  rows,
  withFilter = false,
  activity = false,
}: {
  title: string;
  rows: number;
  withFilter?: boolean;
  activity?: boolean;
}) {
  return (
    <Card>
      <CardHeader
        className={cn(
          "pb-3",
          withFilter &&
            "flex flex-row flex-wrap items-center justify-between gap-2",
        )}
      >
        <CardTitle className="text-base">{title}</CardTitle>
        {withFilter && <Skeleton className="h-7 w-28" />}
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-border flex flex-col divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className={cn("h-4", PRIMARY_WIDTHS[i % 4])} />
                <Skeleton className={cn("h-3", SECONDARY_WIDTHS[i % 4])} />
              </div>
              {activity ? (
                <Skeleton className="h-3 w-14 self-start" />
              ) : (
                <Skeleton className="h-5.5 w-14 rounded-full" />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
