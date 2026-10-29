import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { LifecycleOverview } from "@/types/dashboard";

/** Fleet age and refresh outlook: how many assets are past (or nearing) the end of their useful
 * life, the fleet split into age bands, and the assets to replace first. Age bands have no
 * assets-list filter to link to, so only the refresh rows are links. */
export function LifecycleCard({ data }: { data: LifecycleOverview }) {
  const max = Math.max(1, ...data.ageBands.map((b) => b.count));
  const dated = data.ageBands.reduce((sum, b) => sum + b.count, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        <div className="grid grid-cols-2 gap-3">
          <Figure
            label="Past useful life"
            value={data.pastUsefulLife}
            tone={data.pastUsefulLife > 0 ? "danger" : "default"}
          />
          <Figure
            label={`Due within ${data.dueWithinMonths} months`}
            value={data.dueSoon}
            tone={data.dueSoon > 0 ? "warning" : "default"}
          />
        </div>

        {dated === 0 ? (
          <p className="text-muted-foreground text-sm">
            No assets have a purchase date yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {data.ageBands.map((band) => (
              <li
                key={band.label}
                className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm"
              >
                <span className="truncate">{band.label}</span>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${(band.count / max) * 100}%` }}
                  />
                </div>
                <span className="text-right tabular-nums">{band.count}</span>
              </li>
            ))}
          </ul>
        )}
        {data.unknownAge > 0 && (
          <p className="text-muted-foreground -mt-2 text-xs">
            {data.unknownAge} asset{data.unknownAge === 1 ? "" : "s"} without a
            purchase date not shown.
          </p>
        )}

        {data.refreshDue.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
              Replace first
            </p>
            <ul className="divide-border flex flex-col divide-y">
              {data.refreshDue.map((item) => (
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
                        {item.assetTag} · end of life{" "}
                        {new Date(item.endOfLife).toLocaleDateString("en-KE")}
                      </span>
                    </span>
                    <Badge
                      variant={item.daysRemaining <= 0 ? "danger" : "warning"}
                      className="shrink-0"
                    >
                      {item.daysRemaining <= 0
                        ? `${-item.daysRemaining}d over`
                        : `in ${item.daysRemaining}d`}
                    </Badge>
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

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "warning" | "danger";
}) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-2xl font-semibold tabular-nums",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
        )}
      >
        {value.toLocaleString("en-KE")}
      </p>
    </div>
  );
}
