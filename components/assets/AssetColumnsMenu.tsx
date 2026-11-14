"use client";

import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  ColumnsIcon,
} from "@phosphor-icons/react/ssr";
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
          <ColumnsIcon className="h-3.5 w-3.5" />
          Columns
          <CaretDownIcon className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" customLayout>
        {/* The header and footer stay pinned; only the column list between them scrolls. */}
        <div className="shrink-0 px-1 pt-1">
          <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
          <DropdownMenuSeparator className="mb-0" />
        </div>
        <div className="scroll-area-thin min-h-0 flex-1 overflow-y-auto p-1 [--scrollbar-inset:0.5rem]">
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
        </div>
        <div className="shrink-0 px-1 pb-1">
          <DropdownMenuSeparator className="mt-0" />
          <DropdownMenuItem
            disabled={columns.isDefault}
            onSelect={(e) => {
              e.preventDefault();
              columns.reset();
            }}
          >
            <ArrowCounterClockwiseIcon className="h-4 w-4" />
            Reset to default
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
