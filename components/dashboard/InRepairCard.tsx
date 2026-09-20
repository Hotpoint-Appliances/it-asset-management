import Link from "next/link";
import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/format";
import type { AssetInRepairItem } from "@/types/dashboard";

export function InRepairCard({ items }: { items: AssetInRepairItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Assets in repair</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4" />
            Nothing is in repair right now.
          </div>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.maintenanceId}>
                <Link
                  href={`/assets/${item.assetId}`}
                  className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.assetName}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.assetTag}
                      {item.vendorName ? ` · ${item.vendorName}` : ""} · started{" "}
                      {formatRelativeTime(item.startedAt)}
                    </span>
                  </span>
                  <Badge variant="warning" className="shrink-0 capitalize">
                    {item.maintenanceType}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
