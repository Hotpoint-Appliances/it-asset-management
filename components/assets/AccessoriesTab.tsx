"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import axios from "axios";
import { Cable, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/Dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { useUIStore } from "@/store";
import { ConfirmSummary, useConfirm } from "@/components/shared/ConfirmDialog";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import { canEditAccessories } from "@/lib/assetAccessories";
import { formatLookupName } from "@/lib/badgeVariants";
import {
  AccessoriesEditor,
  accessoriesPayload,
  accessoryOptions,
  rowsFromAccessories,
  type AccessoryRow,
} from "./AccessoriesEditor";
import type { Accessory, AssetAccessory } from "@/types/accessory";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

/** Accessories tab on the asset detail page: the attached list for everyone, plus an "Edit
 * accessories" dialog for admin/asset_manager while the status allows changes
 * (docs/asset-lifecycle-flow.md rule 8). Saves the whole list through
 * PUT /api/assets/[id]/accessories, the same sync the asset form uses. */
export function AccessoriesTab({
  assetId,
  statusName,
  accessories,
  catalog,
  canManage,
}: {
  assetId: string;
  statusName: string;
  accessories: AssetAccessory[];
  /** Active catalog entries for the picker. */
  catalog: Accessory[];
  canManage: boolean;
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<AccessoryRow[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const editable = canEditAccessories(statusName);
  const options = React.useMemo(
    () => accessoryOptions(catalog, accessories),
    [catalog, accessories],
  );

  useSyncOnOpen(open, () => {
    setRows(rowsFromAccessories(accessories));
    setError(null);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = accessoriesPayload(rows);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    const nameOf = (id: number) =>
      accessories.find((a) => a.accessoryId === id)?.name ??
      catalog.find((a) => a.id === id)?.name ??
      "Accessory";
    const confirmed = await confirm({
      title: "Save accessories?",
      description: (
        <ConfirmSummary
          intro={
            result.items.length > 0
              ? "The asset's accessories will be set to:"
              : accessories.length > 0
                ? "All accessories will be removed from this asset."
                : "No accessories will be attached to this asset."
          }
          rows={result.items.map((item) => [
            nameOf(item.accessoryId),
            `× ${item.quantity}`,
          ])}
        />
      ),
      confirmLabel: "Save accessories",
    });
    if (!confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.put(`/api/assets/${assetId}/accessories`, {
        accessories: result.items,
      });
      setOpen(false);
      router.refresh(() =>
        addToast({ title: "Accessories updated", variant: "success" }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!editable && (
            <p className="text-muted-foreground text-sm">
              Accessories can&apos;t be changed while the asset is{" "}
              {formatLookupName(statusName)}.
            </p>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit accessories
            </Button>
          )}
        </div>
      )}

      {accessories.length === 0 ? (
        <EmptyState
          icon={Cable}
          title="No accessories"
          description="Accessories attached to this asset will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accessory</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accessories.map((a) => (
              <TableRow key={a.accessoryId}>
                <TableCell className="font-medium">
                  <span className="flex flex-wrap items-center gap-2">
                    {a.name}
                    {!a.isActive && <Badge variant="neutral">Retired</Badge>}
                  </span>
                </TableCell>
                <TableCell>{a.quantity}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.notes ?? "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canManage && editable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit accessories</DialogTitle>
              <DialogDescription>
                Add, remove or adjust the accessories attached to this asset.
                Every change is recorded in the audit log.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex min-h-0 flex-1 flex-col"
            >
              <DialogBody>
                <AccessoriesEditor
                  idPrefix="edit-accessories"
                  rows={rows}
                  onChange={(next) => {
                    setRows(next);
                    setError(null);
                  }}
                  options={options}
                />
                {error && (
                  <p role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                )}
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {confirmDialog}
    </div>
  );
}
