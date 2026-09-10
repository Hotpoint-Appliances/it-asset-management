"use client";

import * as React from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  ArrowRightLeft,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";
import { TransferDialog } from "./TransferDialog";
import { DisposalDialog } from "./DisposalDialog";
import type { AssetListItem } from "@/types/asset";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";

/** Asset list row actions (phase-5-asset-lifecycle, per itam-design-system's "row-level actions
 * via DropdownMenu (View, Edit, Transfer, Dispose)" and phase-4's note that the list gains
 * Transfer/Dispose alongside its own View/Edit). Reuses the same TransferDialog/DisposalDialog
 * as the detail page — AssetListItem now carries the location/department/owner ids those need
 * (see types/asset.ts), so no second fetch is required to prefill Transfer. */
export function AssetRowActions({
  asset,
  canManage,
  locations,
  departments,
}: {
  asset: AssetListItem;
  canManage: boolean;
  locations: Location[];
  departments: Department[];
}) {
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [disposeOpen, setDisposeOpen] = React.useState(false);
  const isDisposed = asset.statusName === "disposed";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/assets/${asset.id}`}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuItem asChild>
              <Link href={`/assets/${asset.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          {canManage && !isDisposed && (
            <DropdownMenuItem onSelect={() => setTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4" />
              Transfer
            </DropdownMenuItem>
          )}
          {canManage && !isDisposed && (
            <DropdownMenuItem
              onSelect={() => setDisposeOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Dispose
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage && (
        <TransferDialog
          asset={asset}
          locations={locations}
          departments={departments}
          open={transferOpen}
          onOpenChange={setTransferOpen}
        />
      )}
      {canManage && (
        <DisposalDialog
          assetId={asset.id}
          assetName={asset.name}
          open={disposeOpen}
          onOpenChange={setDisposeOpen}
        />
      )}
    </>
  );
}
