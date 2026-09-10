"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { NOTE_REQUIRED_STATUSES } from "./StatusDialog";
import { useUIStore } from "@/store";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import { formatCurrency } from "@/lib/format";
import type {
  AssetMaintenance,
  MaintenanceType,
  MaintenanceStatus,
} from "@/types/maintenance";
import type { Vendor } from "@/types/vendor";
import type { AssetStatus } from "@/types/assetStatus";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

const STATUS_VARIANT: Record<
  MaintenanceStatus,
  "neutral" | "warning" | "success" | "outline"
> = {
  scheduled: "neutral",
  in_progress: "warning",
  completed: "success",
  cancelled: "outline",
};

/** Maintenance module (phase-5-asset-lifecycle Step 4): create/list `asset_maintenance` records
 * and drive the two non-forced prompts docs/asset-lifecycle-flow.md rule 5 calls for — marking
 * `in_progress` offers to also set the asset's status to `in_repair` (reusing Step 3's action),
 * marking `completed` offers to restore whatever status preceded that in_repair transition
 * (resolved server-side via the unified audit log — see the PATCH route's
 * `suggestedRestoreStatusId`). Both are confirm dialogs, not automatic, per the lifecycle doc. */
export function MaintenanceTab({
  assetId,
  initialMaintenance,
  vendors,
  statuses,
  canManage,
  defaultCreateType,
}: {
  assetId: string;
  initialMaintenance: AssetMaintenance[];
  vendors: Vendor[];
  statuses: AssetStatus[];
  canManage: boolean;
  defaultCreateType?: MaintenanceType;
}) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [maintenanceType, setMaintenanceType] = React.useState<MaintenanceType>(
    defaultCreateType ?? "repair",
  );
  const [vendorId, setVendorId] = React.useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [inRepairPrompt, setInRepairPrompt] =
    React.useState<AssetMaintenance | null>(null);
  const [restorePrompt, setRestorePrompt] = React.useState<{
    record: AssetMaintenance;
    statusId: number;
  } | null>(null);
  const [promptSubmitting, setPromptSubmitting] = React.useState(false);
  const [restoreNote, setRestoreNote] = React.useState("");

  const inRepairStatus = statuses.find((s) => s.name === "in_repair");
  const restoreTargetStatus = restorePrompt
    ? statuses.find((s) => s.id === restorePrompt.statusId)
    : null;
  const restoreNoteRequired =
    !!restoreTargetStatus &&
    NOTE_REQUIRED_STATUSES.has(restoreTargetStatus.name);

  useSyncOnOpen(!!restorePrompt, () => setRestoreNote(""));

  useSyncOnOpen(createOpen, () => {
    setMaintenanceType(defaultCreateType ?? "repair");
    setVendorId(null);
    setScheduledDate("");
    setNotes("");
    setError(null);
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/assets/${assetId}/maintenance`, {
        maintenanceType,
        vendorId,
        scheduledDate: scheduledDate || null,
        notes: notes || null,
      });
      addToast({ title: "Maintenance record created" });
      setCreateOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(
    record: AssetMaintenance,
    status: MaintenanceStatus,
  ) {
    try {
      const res = await axios.patch<{
        maintenance: AssetMaintenance;
        suggestedRestoreStatusId: number | null;
      }>(`/api/assets/${assetId}/maintenance/${record.id}`, {
        status,
        completedDate: null,
        cost: record.cost,
        notes: record.notes,
      });
      addToast({ title: "Maintenance record updated" });
      router.refresh();

      if (status === "in_progress" && inRepairStatus) {
        setInRepairPrompt(record);
      } else if (
        status === "completed" &&
        res.data.suggestedRestoreStatusId != null
      ) {
        setRestorePrompt({
          record,
          statusId: res.data.suggestedRestoreStatusId,
        });
      }
    } catch (err) {
      addToast({
        title: "Could not update record",
        description: errorMessage(err),
        variant: "error",
      });
    }
  }

  async function confirmStatusChange(
    statusId: number,
    note: string | null = null,
  ) {
    setPromptSubmitting(true);
    try {
      await axios.post(`/api/assets/${assetId}/status`, {
        statusId,
        note,
      });
      addToast({ title: "Asset status updated" });
      router.refresh();
    } catch (err) {
      addToast({
        title: "Could not update asset status",
        description: errorMessage(err),
        variant: "error",
      });
    } finally {
      setPromptSubmitting(false);
      setInRepairPrompt(null);
      setRestorePrompt(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Log maintenance
          </Button>
        </div>
      )}

      {initialMaintenance.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance records"
          description="Repair, service, and inspection events for this asset will appear here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {initialMaintenance.map((record) => (
            <li
              key={record.id}
              className="border-border flex flex-col gap-2 rounded-md border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">
                    {record.maintenanceType}
                  </span>
                  <Badge variant={STATUS_VARIANT[record.status]}>
                    {record.status.replace("_", " ")}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs">
                  {record.scheduledDate
                    ? new Date(record.scheduledDate).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
                {record.vendorName && <span>Vendor: {record.vendorName}</span>}
                {record.completedDate && (
                  <span>
                    Completed:{" "}
                    {new Date(record.completedDate).toLocaleDateString()}
                  </span>
                )}
                {record.cost != null && (
                  <span>Cost: {formatCurrency(record.cost)}</span>
                )}
                <span>By {record.createdByName}</span>
              </div>
              {record.notes && <p>{record.notes}</p>}
              {canManage &&
                (record.status === "scheduled" ||
                  record.status === "in_progress") && (
                  <div className="flex gap-2">
                    {record.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(record, "in_progress")}
                      >
                        Start
                      </Button>
                    )}
                    {record.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(record, "completed")}
                      >
                        Mark completed
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatus(record, "cancelled")}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log maintenance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={maintenanceType}
                  onChange={(e) =>
                    setMaintenanceType(e.target.value as MaintenanceType)
                  }
                >
                  <option value="repair">Repair</option>
                  <option value="service">Service</option>
                  <option value="inspection">Inspection</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Vendor</label>
                <Select
                  value={vendorId ?? ""}
                  onChange={(e) =>
                    setVendorId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">None</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Scheduled date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="border-border bg-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-border bg-background focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

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

      {inRepairStatus && (
        <ConfirmDialog
          open={!!inRepairPrompt}
          onOpenChange={(open) => !open && setInRepairPrompt(null)}
          title="Set asset status to in_repair?"
          description="This maintenance record just started. Set the asset's status to in_repair to reflect that it's temporarily unavailable?"
          confirmLabel="Set status"
          submitting={promptSubmitting}
          onConfirm={() => confirmStatusChange(inRepairStatus.id)}
        />
      )}
      <ConfirmDialog
        open={!!restorePrompt}
        onOpenChange={(open) => !open && setRestorePrompt(null)}
        title="Restore the asset's prior status?"
        description={
          <div className="flex flex-col gap-2">
            <span>
              This maintenance record is now complete. Restore the asset&apos;s
              status to what it was before this repair
              {restoreTargetStatus
                ? ` (${restoreTargetStatus.name.replace("_", " ")})`
                : ""}
              ?
            </span>
            {restoreNoteRequired && (
              <textarea
                required
                rows={2}
                value={restoreNote}
                onChange={(e) => setRestoreNote(e.target.value)}
                placeholder={`Note required for ${restoreTargetStatus?.name}…`}
                className="border-border bg-background focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            )}
          </div>
        }
        confirmLabel="Restore status"
        submitting={promptSubmitting}
        confirmDisabled={restoreNoteRequired && !restoreNote.trim()}
        onConfirm={() =>
          restorePrompt &&
          confirmStatusChange(restorePrompt.statusId, restoreNote || null)
        }
      />
    </div>
  );
}
