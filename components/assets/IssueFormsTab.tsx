"use client";

import * as React from "react";
import axios from "axios";
import { FileSignature, Send, XCircle } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { FieldError } from "@/components/shared/FieldError";
import { Pagination } from "@/components/shared/Pagination";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { useFieldErrors } from "@/lib/hooks/useFieldErrors";
import { usePagination } from "@/lib/hooks/usePagination";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import { formatDate, formatDateTime } from "@/lib/format";
import { ISSUE_FORM_STATUS_LABELS } from "@/lib/issueForms/rules";
import { useUIStore } from "@/store";
import type { IssueForm, IssueFormStatus } from "@/types/issueForm";

const PAGE_SIZE = 10;

const STATUS_VARIANTS: Record<
  IssueFormStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  pending: "warning",
  acknowledged: "success",
  disputed: "danger",
  voided: "neutral",
  superseded: "neutral",
  expired: "neutral",
};

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

/** The line under a form's status saying what happened to it. */
function statusDetail(form: IssueForm): string | null {
  switch (form.status) {
    case "acknowledged":
    case "superseded":
      return form.acknowledgedAt
        ? `Signed ${formatDateTime(form.acknowledgedAt)}`
        : null;
    case "disputed":
      return form.disputeReason;
    case "voided":
      return form.voidReason;
    case "pending":
      return form.emailStatus === "failed"
        ? "The email didn't send"
        : `Link open until ${formatDate(form.expiresAt)}`;
    default:
      return null;
  }
}

export function IssueFormsTab({
  assetId,
  forms,
}: {
  assetId: string;
  forms: IssueForm[];
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const pagination = usePagination(forms, PAGE_SIZE);
  const [resending, setResending] = React.useState<string | null>(null);
  const [voiding, setVoiding] = React.useState<IssueForm | null>(null);

  async function handleResend(form: IssueForm) {
    setResending(form.id);
    try {
      const { data } = await axios.post<{ emailSent: boolean }>(
        `/api/assets/${assetId}/issue-forms/${form.id}/resend`,
      );
      router.refresh(() =>
        addToast(
          data.emailSent
            ? { title: `${form.formNumber} re-sent`, variant: "success" }
            : {
                title: "The email didn't send",
                description: "Try again, or download the PDF instead.",
                variant: "error",
              },
        ),
      );
    } catch (err) {
      addToast({
        title: "Could not re-send",
        description: errorMessage(err),
        variant: "error",
      });
    } finally {
      setResending(null);
    }
  }

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        title="No issue forms yet"
        description="Forms issued for this asset will appear here. Start one from the Actions menu."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>Issued to</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.map((form) => {
            const detail = statusDetail(form);
            const open =
              form.status === "pending" || form.status === "disputed";
            return (
              <TableRow key={form.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {form.formNumber}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{form.issuedToName}</span>
                    <span className="text-muted-foreground text-xs">
                      {form.recipientEmail}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(form.issueDate)}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-64 flex-col gap-1">
                    <Badge variant={STATUS_VARIANTS[form.status]}>
                      {ISSUE_FORM_STATUS_LABELS[form.status]}
                    </Badge>
                    {detail && (
                      <span className="text-muted-foreground text-xs break-words">
                        {detail}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <DownloadButton
                      href={`/api/assets/${assetId}/issue-forms/${form.id}/pdf`}
                      variant="outline"
                      size="sm"
                    >
                      PDF
                    </DownloadButton>
                    {form.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={resending === form.id}
                        onClick={() => handleResend(form)}
                      >
                        {resending !== form.id && (
                          <Send aria-hidden="true" className="h-4 w-4" />
                        )}
                        Re-send
                      </Button>
                    )}
                    {open && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVoiding(form)}
                      >
                        <XCircle aria-hidden="true" className="h-4 w-4" />
                        Void
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Pagination {...pagination} noun="forms" />
      <VoidDialog
        assetId={assetId}
        form={voiding}
        onClose={() => setVoiding(null)}
      />
    </div>
  );
}

function VoidDialog({
  assetId,
  form,
  onClose,
}: {
  assetId: string;
  form: IssueForm | null;
  onClose: () => void;
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const fieldId = React.useId();
  const fields = useFieldErrors<"reason">();
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useSyncOnOpen(form !== null, () => {
    setReason("");
    setError(null);
    fields.reset();
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const ok = fields.validate(
      { reason: !reason.trim() && "Say why this form is being cancelled." },
      event.currentTarget,
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/assets/${assetId}/issue-forms/${form.id}/void`, {
        reason,
      });
      onClose();
      router.refresh(() =>
        addToast({ title: `${form.formNumber} voided`, variant: "success" }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={form !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void {form?.formNumber}?</DialogTitle>
          <DialogDescription>
            The emailed link stops working straight away and this can&apos;t be
            undone. You can trigger a new form afterwards.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={fieldId} className="text-sm font-medium">
                Reason
                <RequiredMark />
              </label>
              <textarea
                id={fieldId}
                required
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  fields.clear("reason");
                }}
                {...fields.invalid("reason")}
                className="border-border bg-background focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
              <FieldError
                id={fields.errorId("reason")}
                message={fields.errors.reason}
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep form
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" loading={submitting}>
              {submitting ? "Voiding…" : "Void form"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
