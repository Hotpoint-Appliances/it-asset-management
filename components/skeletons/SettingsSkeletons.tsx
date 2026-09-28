import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { settingsSections } from "@/components/layout/settings-sections";
import { cn } from "@/lib/utils";
import { TableSkeleton, type SkeletonColumn } from "./TableSkeleton";

// Settings pages render inside app/(dashboard)/settings/layout.tsx, whose title and tab strip
// stay mounted while a section loads, so these only cover the section body.

/** The settings index is a static card grid, so this is the real grid minus the links. */
export function SettingsIndexSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {settingsSections.map((section) => (
        <Card key={section.href} className="h-full">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <section.icon className="text-muted-foreground h-5 w-5" />
            <div>
              <CardTitle className="text-base">{section.label}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

/** Toolbar ("New …" button) above a lookup table, as in the vendors, users, departments,
 * conditions and statuses managers. */
export function SettingsTableSkeleton({
  columns,
}: {
  columns: SkeletonColumn[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36" />
      </div>
      <TableSkeleton columns={columns} rows={6} />
    </div>
  );
}

// Depth per row, and whether it has children (so shows a chevron), for a plausible tree.
const TREE_ROWS: { depth: number; parent: boolean }[] = [
  { depth: 0, parent: true },
  { depth: 1, parent: false },
  { depth: 1, parent: true },
  { depth: 2, parent: false },
  { depth: 0, parent: true },
  { depth: 1, parent: false },
  { depth: 0, parent: false },
];
const NAME_WIDTHS = ["w-32", "w-24", "w-28", "w-20"];

/** Toolbar above the indented tree list used by the categories and locations managers. */
export function SettingsTreeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="border-border rounded-xl border shadow-sm">
        {TREE_ROWS.map((row, i) => (
          <div
            key={i}
            className="border-border flex items-center justify-between gap-2 border-b py-2 pr-2 last:border-0"
            style={{ paddingLeft: `calc(0.5rem + ${row.depth * 1.5}rem)` }}
          >
            <div className="flex min-w-0 items-center gap-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {row.parent && <Skeleton className="h-3 w-3 rounded-sm" />}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className={cn("h-4", NAME_WIDTHS[i % 4])} />
                {i % 3 === 0 && <Skeleton className="h-3 w-40" />}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <span
                  key={j}
                  className="flex h-10 w-10 items-center justify-center"
                >
                  <Skeleton className="h-4 w-4 rounded-sm" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
