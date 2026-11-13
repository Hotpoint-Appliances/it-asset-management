"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/Table";
import { cn } from "@/lib/utils";

/** A column header that sorts the list. `aria-sort` sits on the header cell (where assistive tech
 * reads it); the button's label says what a click will do next. */
export function SortableHead({
  label,
  direction,
  onSort,
}: {
  label: string;
  direction: "asc" | "desc" | null;
  onSort: () => void;
}) {
  const Icon =
    direction === "asc"
      ? ArrowUp
      : direction === "desc"
        ? ArrowDown
        : ArrowUpDown;
  const next =
    direction === null
      ? "sort ascending"
      : direction === "asc"
        ? "sort descending"
        : "clear sort";
  return (
    <TableHead
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        onClick={onSort}
        aria-label={`${label}, ${next}`}
        className={cn(
          "hover:text-foreground focus-visible:ring-ring -mx-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 tracking-wide whitespace-nowrap uppercase focus-visible:ring-2 focus-visible:outline-none",
          direction && "text-foreground",
        )}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn("h-3.5 w-3.5", !direction && "opacity-40")}
        />
      </button>
    </TableHead>
  );
}
