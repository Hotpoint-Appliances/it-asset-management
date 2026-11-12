"use client";

import * as React from "react";
import axios from "axios";
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
import { FieldError } from "@/components/shared/FieldError";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { useFieldErrors } from "@/lib/hooks/useFieldErrors";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import { formatDate, formatDateTime } from "@/lib/format";
import { useUIStore } from "@/store";
import type { IssueForm } from "@/types/issueForm";

// Re-send and void for an issue form, shared by an asset's Issue forms tab and the register
// (/issue-forms). Both refresh the route afterwards, so whichever list is showing updates.

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

/** The line under a form's status saying what happened to it. */
export function issueFormStatusDetail(form: IssueForm): string | null {
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

type FormRef = Pick<IssueForm, "id" | "assetId" | "formNumber">;

/** `resending` is the id of the form being re-sent, so only its button spins. */
export function useResendIssueForm(): {
  resending: string | null;
  resend: (form: FormRef) => Promise<void>;
} {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [resending, setResending] = React.useState<string | null>(null);

  async function resend(form: FormRef) {
    setResending(form.id);
    try {
      const { data } = await axios.post<{ emailSent: boolean }>(
        `/api/assets/${form.assetId}/issue-forms/${form.id}/resend`,
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

  return { resending, resend };
}

export function IssueFormVoidDialog({
  form,
  onClose,
}: {
  form: Pick<IssueForm, "id" | "assetId" | "formNumber"> | null;
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
      await axios.post(
        `/api/assets/${form.assetId}/issue-forms/${form.id}/void`,
        {
          reason,
        },
      );
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
