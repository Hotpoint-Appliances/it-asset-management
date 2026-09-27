import { Building2, MapPin, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Audit Log", "Attachments", "Maintenance"];

// Same order as OverviewGrid in components/assets/AssetDetail.tsx.
const OVERVIEW_LABELS = [
  "Category",
  "Model number",
  "Serial number",
  "Vendor",
  "Purchase date",
  "Purchase cost",
  "Warranty expiry",
  "Depreciation method",
  "Useful life",
  "Salvage value",
  "Owner email",
  "Created by",
  "Created",
  "Last updated",
];
const VALUE_WIDTHS = ["w-28", "w-36", "w-24", "w-32"];

/** Mirrors components/assets/AssetDetail.tsx: header card, tab strip (Overview selected) and the
 * overview grid. Buttons follow the admin / asset_manager layout. */
export function AssetDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <Skeleton className="border-border h-32 w-32 shrink-0 border" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <Skeleton className="my-0.5 h-3 w-24" />
                <Skeleton className="my-1 h-6 w-56" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5.5 w-16 rounded-full" />
              <Skeleton className="h-5.5 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {[MapPin, Building2, UserRound].map((Icon, i) => (
                <div key={i} className="flex h-5 items-center gap-1.5">
                  <Icon className="text-muted-foreground h-3.5 w-3.5" />
                  <Skeleton className={cn("h-4", VALUE_WIDTHS[i])} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="border-border flex gap-1 overflow-hidden border-b">
          {TABS.map((tab, i) => (
            <span
              key={tab}
              className={cn(
                "min-h-11 shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
                i === 0
                  ? "border-primary text-foreground"
                  : "text-muted-foreground border-transparent",
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className="pt-4">
          <Card>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
              {OVERVIEW_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {label}
                  </span>
                  <Skeleton className={cn("my-0.5 h-4", VALUE_WIDTHS[i % 4])} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
