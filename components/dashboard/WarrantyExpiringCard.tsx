"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { WarrantyExpiringItem } from "@/types/dashboard";

/** "Warranty expiring soon" widget: the server passes everything inside the widest configured
 * window, and the segmented control narrows it client-side (30 / 60 / 90 days by default; the
 * windows come from `system_settings`). */
export function WarrantyExpiringCard({
  items,
  windows,
}: {
  items: WarrantyExpiringItem[];
  windows: number[];
}) {
  const [windowDays, setWindowDays] = React.useState(windows[0]);
  const visible = items.filter((i) => i.daysRemaining <= windowDays);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Warranty expiring soon</CardTitle>
        <div
          role="group"
          aria-label="Warranty window"
          className="bg-muted flex rounded-lg p-0.5"
        >
          {windows.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={w === windowDays}
              onClick={() => setWindowDays(w)}
              className={cn(
                "focus-visible:ring-ring rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                w === windowDays
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w}d
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {visible.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4" />
            No warranties expire in the next {windowDays} days.
          </div>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {visible.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/assets/${item.id}`}
                  className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.assetTag} · {item.departmentName} ·{" "}
                      {new Date(item.warrantyExpiry).toLocaleDateString(
                        "en-KE",
                      )}
                    </span>
                  </span>
                  <Badge
                    variant={item.daysRemaining <= 30 ? "warning" : "neutral"}
                    className="shrink-0"
                  >
                    {item.daysRemaining === 0
                      ? "today"
                      : `${item.daysRemaining}d`}
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
