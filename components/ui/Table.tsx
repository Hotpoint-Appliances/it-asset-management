import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  // The outer box clips to the rounded corners and the inner one scrolls. `relative` makes the
  // scroll box the containing block of absolutely positioned descendants (e.g. the action buttons'
  // sr-only labels). Without it they escape the overflow clip and widen the whole page on mobile
  // once a table is wider than the viewport.
  <div className="border-border w-full overflow-clip rounded-xl border shadow-sm">
    <div className="scroll-area-thin relative w-full overflow-x-auto overscroll-x-contain">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-muted/50 [&_tr]:border-border [&_tr]:border-b",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-border hover:bg-muted/50 border-b transition-colors",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "text-muted-foreground h-11 px-4 text-left align-middle text-xs font-medium tracking-wide uppercase",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("h-11 px-4 py-3 align-middle", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

/** Pins a table's last column to the right edge while the rest scrolls under it. It needs opaque
 * backgrounds matching the translucent header and row hover tints, and the divider is a pseudo
 * element because a collapsed table's borders don't travel with a sticky cell. The row needs
 * `group/row` for the hover tint. */
const stickyEndClass =
  "before:bg-border sticky right-0 z-10 before:absolute before:inset-y-0 before:left-0 before:w-px";
export const stickyEndHeadClass = cn(
  stickyEndClass,
  "bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))]",
);
export const stickyEndCellClass = cn(
  stickyEndClass,
  "bg-background group-hover/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))] transition-colors",
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
