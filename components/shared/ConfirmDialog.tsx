"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";

/** Generic confirm/prompt Dialog shared by every destructive or "are you sure" action added in
 * phase-5-asset-lifecycle (soft delete, disposal's consequence statement, the maintenance
 * module's non-forced status-change prompts) — per itam-design-system's "destructive/terminal
 * actions always a confirmation Dialog with the consequence stated explicitly" rule. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  submitting,
  confirmDisabled,
  destructive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  submitting?: boolean;
  /** Disables the confirm button without showing the "Working…" submitting label — e.g. a
   * required field inside `description` that isn't filled in yet. */
  confirmDisabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* asChild swaps Radix's default <p> for a <div> — description can carry block content
              (e.g. MaintenanceTab's restore-prompt note field), which isn't valid inside a <p>. */}
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={submitting || confirmDisabled}
            onClick={onConfirm}
          >
            {submitting ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
