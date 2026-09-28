import Link from "next/link";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ACTION_LABELS } from "@/components/assets/AuditLogTimeline";
import { formatLookupName } from "@/lib/badgeVariants";
import { formatRelativeTime } from "@/lib/format";
import type { RecentActivityItem } from "@/types/dashboard";

export function RecentActivityCard({ items }: { items: RecentActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            No activity yet.
          </div>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/assets/${item.assetId}`}
                  className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex flex-col gap-0.5 rounded-md px-2 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">
                      {ACTION_LABELS[item.actionType] ??
                        formatLookupName(item.actionType)}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {item.assetName}
                      </span>
                    </span>
                    <time
                      dateTime={item.performedAt}
                      className="text-muted-foreground shrink-0 text-xs"
                    >
                      {formatRelativeTime(item.performedAt)}
                    </time>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {item.assetTag} · by {item.performedByName}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
