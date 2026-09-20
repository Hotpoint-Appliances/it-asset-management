import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Single headline number (fleet summary). `href` makes the whole tile a link into the
 * pre-filtered assets list, so a count is always one click from the rows behind it. */
export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const body = (
    <Card
      className={cn("h-full transition-colors", href && "hover:bg-muted/50")}
    >
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {value.toLocaleString("en-KE")}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tone === "default" && "bg-muted text-muted-foreground",
            tone === "warning" && "bg-warning/15 text-warning",
            tone === "danger" && "bg-destructive/15 text-destructive",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link
      href={href}
      className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
