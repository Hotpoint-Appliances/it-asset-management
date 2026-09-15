"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { useUIStore } from "@/store";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import { formatLookupName } from "@/lib/badgeVariants";
import type { AssetStatus } from "@/types/assetStatus";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

/** Exported so MaintenanceTab's "restore prior status" prompt (which can land on lost/stolen,
 * per docs/asset-lifecycle-flow.md rule 5's audit-log-driven restore) can check the same rule
 * before submitting, rather than duplicating the status name list. */
export const NOTE_REQUIRED_STATUSES = new Set(["lost", "stolen"]);

/** Status change action (phase-5-asset-lifecycle Step 3). `disposed` is excluded from the
 * dropdown entirely (not just rejected server-side) — docs/asset-lifecycle-flow.md blocks that
 * path so `asset_disposals` is never skipped; disabling the option here is a UX nicety on top of
 * the API's own 400, not a substitute for it. Selecting `in_repair` nudges (doesn't force, per
 * the lifecycle doc) logging a maintenance record via a toast, since that's a separate tab. */
export function StatusDialog({
  assetId,
  currentStatusId,
  statuses,
  open,
  onOpenChange,
}: {
  assetId: string;
  currentStatusId: number;
  statuses: AssetStatus[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const selectable = React.useMemo(
    () => statuses.filter((s) => s.name !== "disposed"),
    [statuses],
  );
  const [statusId, setStatusId] = React.useState(currentStatusId);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useSyncOnOpen(open, () => {
    setStatusId(currentStatusId);
    setNote("");
    setError(null);
  });

  const targetStatus = statuses.find((s) => s.id === statusId);
  const noteRequired =
    !!targetStatus && NOTE_REQUIRED_STATUSES.has(targetStatus.name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/assets/${assetId}/status`, {
        statusId,
        note: note || null,
      });
      addToast({ title: "Status updated", variant: "success" });
      if (targetStatus?.name === "in_repair") {
        addToast({
          title: "Consider logging a maintenance record",
          description: "Open the Maintenance tab to track the repair.",
        });
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={statusId}
              onChange={(e) => setStatusId(Number(e.target.value))}
            >
              {selectable.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatLookupName(s.name)}
                </option>
              ))}
            </Select>
          </div>

          {noteRequired && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Note (required)</label>
              <textarea
                required
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain the circumstances…"
                className="border-border bg-background focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>
          )}

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
  );
}
