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
import type { AssetCondition } from "@/types/assetCondition";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

/** Condition change action (phase-5-asset-lifecycle Step 2). */
export function ConditionDialog({
  assetId,
  currentConditionId,
  conditions,
  open,
  onOpenChange,
}: {
  assetId: string;
  currentConditionId: number;
  conditions: AssetCondition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [conditionId, setConditionId] = React.useState(currentConditionId);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useSyncOnOpen(open, () => {
    setConditionId(currentConditionId);
    setError(null);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/assets/${assetId}/condition`, { conditionId });
      addToast({ title: "Condition updated", variant: "success" });
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
          <DialogTitle>Change condition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Condition</label>
            <Select
              value={conditionId}
              onChange={(e) => setConditionId(Number(e.target.value))}
            >
              {conditions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
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
  );
}
