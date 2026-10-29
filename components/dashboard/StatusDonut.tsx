"use client";

import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { CountByName } from "@/types/dashboard";

export interface DonutItem extends CountByName {
  /** Any CSS color, usually a theme variable (`var(--success)`), so the slice follows dark mode. */
  color: string;
  href: string;
}

/** Fleet split by status as a donut (Recharts), with the total in the middle. The legend beside
 * it prints every status's exact count and links into the filtered assets list, so the chart is
 * never the only way to read a number: statuses that share a color (lost/stolen) still differ by
 * name, and screen readers get the list while the SVG is hidden from them. */
export function StatusDonut({
  title,
  items,
  total,
}: {
  title: string;
  items: DonutItem[];
  total: number;
}) {
  const slices = items.filter((i) => i.count > 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No assets yet.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
            <div className="relative h-36 w-36 shrink-0" aria-hidden>
              <PieChart width={144} height={144} accessibilityLayer={false}>
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.id} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tabular-nums">
                  {total.toLocaleString("en-KE")}
                </span>
                <span className="text-muted-foreground text-xs">assets</span>
              </div>
            </div>
            <ul className="flex w-full min-w-0 flex-col gap-1">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center gap-2 rounded-md px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-0 flex-1 truncate capitalize">
                      {item.name.replace(/_/g, " ")}
                    </span>
                    <span className="tabular-nums">{item.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
