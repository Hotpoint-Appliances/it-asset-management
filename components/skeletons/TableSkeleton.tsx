import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";

export interface SkeletonColumn {
  header: string;
  /** Shape of the body placeholder: plain text, a monospace tag, a badge, or icon buttons. */
  cell?: "text" | "mono" | "badge" | "actions";
  /** Icon buttons in an `actions` cell. */
  actions?: number;
}

// Cycled per cell so rows read as varied data rather than a stamped grid.
const TEXT_WIDTHS = ["w-28", "w-20", "w-32", "w-24"];

/** Built on the real Table primitives so the border, header tint and cell heights can't drift
 * from the tables they stand in for. Headers are static, so they render as real text. */
export function TableSkeleton({
  columns,
  rows = 8,
}: {
  columns: SkeletonColumn[];
  rows?: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.header}
              className={cn(col.cell === "actions" && "text-right")}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, row) => (
          <TableRow key={row} className="hover:bg-transparent">
            {columns.map((col, i) => (
              <TableCell key={col.header}>
                <CellSkeleton column={col} width={TEXT_WIDTHS[(row + i) % 4]} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CellSkeleton({
  column,
  width,
}: {
  column: SkeletonColumn;
  width: string;
}) {
  switch (column.cell) {
    case "mono":
      return <Skeleton className="h-3.5 w-16" />;
    case "badge":
      return <Skeleton className="h-5.5 w-16 rounded-full" />;
    case "actions":
      return (
        <div className="flex justify-end">
          {Array.from({ length: column.actions ?? 1 }).map((_, i) => (
            <span
              key={i}
              className="flex h-10 w-10 items-center justify-center"
            >
              <Skeleton className="h-4 w-4 rounded-sm" />
            </span>
          ))}
        </div>
      );
    default:
      return <Skeleton className={cn("h-4", width)} />;
  }
}
