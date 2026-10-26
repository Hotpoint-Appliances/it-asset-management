"use client";

import * as React from "react";
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Confirm button label while `submitting`, e.g. "Deleting…". */
  submittingLabel?: string;
  onConfirm: () => void;
  submitting?: boolean;
  /** Disables the confirm button without showing the submitting label, e.g. a
   * required field inside `description` that isn't filled in yet. */
  confirmDisabled?: boolean;
  destructive?: boolean;
}

/** Generic confirm/prompt Dialog shared by every destructive or "are you sure" action (deletes,
 * deactivation, disposal's consequence statement, the maintenance module's non-forced
 * status-change prompts, and the pre-save confirms on asset/settings mutations), per
 * itam-design-system's "destructive/terminal actions always a confirmation Dialog with the
 * consequence stated explicitly" rule. */
export function ConfirmDialog({
  open,
  onOpenChange,
  ...content
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ConfirmDialogContent open={open} {...content} />
    </Dialog>
  );
}

/** Callers usually derive `open` from a nullable subject (`open={!!deleting}`) and clear it on
 * close, so during the exit animation every prop built from that subject (title, the name in the
 * description, a deactivate/reactivate label) would flip to its empty state mid-fade. Skipping
 * re-renders while closed keeps the last open frame on screen until Radix unmounts it; the
 * open/close animation itself runs off Dialog context, which memo doesn't block. */
const ConfirmDialogContent = React.memo(
  function ConfirmDialogContent({
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    submittingLabel = "Working…",
    onConfirm,
    submitting,
    confirmDisabled,
    destructive,
  }: Omit<ConfirmDialogProps, "onOpenChange">) {
    return (
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* asChild swaps Radix's default <p> for a <div>, since description can carry block content
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
            {submitting ? submittingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  },
  (_prev, next) => !next.open,
);
