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
  /** Where focus goes once the dialog closes, for a confirm opened without a Dialog trigger
   * (Radix would otherwise drop focus on <body>, outside any form dialog underneath). */
  returnFocusTo?: HTMLElement | null;
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

export type ConfirmOptions = Pick<
  ConfirmDialogProps,
  "title" | "description" | "confirmLabel" | "cancelLabel" | "destructive"
>;

/** Label/value rows for a pre-save confirm's `description`, so every confirm states what is
 * about to change in the same shape. Rows with an empty value are skipped. */
export function ConfirmSummary({
  intro,
  rows,
}: {
  intro?: ReactNode;
  rows: [label: string, value: ReactNode][];
}) {
  const shown = rows.filter(([, value]) => value != null && value !== "");
  return (
    <div className="flex flex-col gap-3">
      {intro && <p>{intro}</p>}
      {shown.length > 0 && (
        <dl className="bg-muted/50 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-lg border p-3">
          {shown.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground font-medium break-words">
                {value}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Promise-based pre-save confirm for form submits, so a handler reads top to bottom:
 * validate, `if (!(await confirm({...}))) return;`, then submit. Render `dialog` anywhere in the
 * component; it stacks above an already-open form Dialog, and cancelling leaves the form (and
 * whatever the user typed) untouched. Resolves false on Cancel, Escape or an outside click. */
export function useConfirm() {
  const [pending, setPending] = React.useState<{
    options: ConfirmOptions;
    resolve: (confirmed: boolean) => void;
    returnFocusTo: HTMLElement | null;
  } | null>(null);

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) =>
        setPending({
          options,
          resolve,
          returnFocusTo:
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null,
        }),
      ),
    [],
  );

  function settle(confirmed: boolean) {
    pending?.resolve(confirmed);
    setPending(null);
  }

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(open) => !open && settle(false)}
      title={pending?.options.title ?? ""}
      description={pending?.options.description}
      confirmLabel={pending?.options.confirmLabel}
      cancelLabel={pending?.options.cancelLabel}
      destructive={pending?.options.destructive}
      returnFocusTo={pending?.returnFocusTo}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, dialog };
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
    returnFocusTo,
  }: Omit<ConfirmDialogProps, "onOpenChange">) {
    return (
      <DialogContent
        className="sm:max-w-sm"
        onCloseAutoFocus={(e) => {
          if (!returnFocusTo?.isConnected) return;
          e.preventDefault();
          returnFocusTo.focus();
        }}
      >
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
