import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { CountByName } from "@/types/dashboard";

export interface BarItem extends CountByName {
  /** Tailwind background class for the bar; defaults to the accent color. */
  barClass?: string;
  /** Makes the row a link into the assets list filtered to this bucket. */
  href?: string;
}

/** Hand-rolled horizontal bar chart (no charting dependency, per itam-conventions' fixed stack):
 * one row per bucket with the exact count printed beside the bar, so the chart never depends on
 * color or bar length alone to be read. */
export function BarBreakdown({
  title,
  items,
  emptyText = "No assets yet.",
}: {
  title: string;
  items: BarItem[];
  emptyText?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.every((i) => i.count === 0) ? (
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => {
              const row = (
                <div className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="truncate capitalize">
                    {item.name.replace(/_/g, " ")}
                  </span>
                  <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.barClass ?? "bg-primary",
                      )}
                      style={{ width: `${(item.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums">{item.count}</span>
                </div>
              );
              return (
                <li key={item.name}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 block rounded-md px-2 py-0.5 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
