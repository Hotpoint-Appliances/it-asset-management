"use client";

import { ChevronDown, Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  ASSET_COLUMNS,
  type useAssetColumns,
} from "@/lib/hooks/useAssetColumns";

/** Show/hide menu for the assets table. Stays open while toggling so several columns can be changed
 * in one go. Only affects this view: the Export button always downloads the full register. */
export function AssetColumnsMenu({
  columns,
}: {
  columns: ReturnType<typeof useAssetColumns>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ASSET_COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={columns.isVisible(column.key)}
            onCheckedChange={(checked) =>
              columns.setVisible(column.key, checked === true)
            }
            onSelect={(e) => e.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={columns.isDefault}
          onSelect={(e) => {
            e.preventDefault();
            columns.reset();
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset to default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
