"use client";

import * as React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
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
import { useFieldErrors, looksLikeEmail } from "@/lib/hooks/useFieldErrors";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { formatDate } from "@/lib/format";
import { REISSUE_REASONS } from "@/lib/issueForms/rules";
import { useUIStore } from "@/store";
import type { IssueFormPrefill } from "@/types/issueForm";

type Field = "make" | "model" | "payroll" | "approver" | "email";

const TEXTAREA =
  "border-border bg-background focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

/** Triggers an equipment issue form. Its fields are seeded from a fresh prefill each time it
 * opens, so the inner form is only mounted once that has arrived. */
export function IssueFormDialog({
  assetId,
  open,
  onOpenChange,
}: {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const prefill = useQuery({
    queryKey: ["issue-form-prefill", assetId],
    queryFn: async () =>
      (
        await axios.get<IssueFormPrefill>(
          `/api/assets/${assetId}/issue-forms/prefill`,
        )
      ).data,
    enabled: open,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    // A refetch re-keys the form below, which would throw away whatever has been typed.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue equipment form</DialogTitle>
          <DialogDescription>
            The owner gets an emailed link to review and acknowledge this form.
          </DialogDescription>
        </DialogHeader>
        {prefill.data ? (
          <IssueFormFields
            key={prefill.dataUpdatedAt}
            assetId={assetId}
            prefill={prefill.data}
            onDone={() => onOpenChange(false)}
          />
        ) : prefill.isError ? (
          <>
            <DialogBody>
              <p role="alert" className="text-destructive text-sm">
                {errorMessage(prefill.error)}
              </p>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <DialogBody>
            <div aria-busy="true" className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IssueFormFields({
  assetId,
  prefill,
  onDone,
}: {
  assetId: string;
  prefill: IssueFormPrefill;
  onDone: () => void;
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const id = React.useId();
  const fields = useFieldErrors<Field>();
  const [make, setMake] = React.useState(prefill.make);
  const [model, setModel] = React.useState(prefill.model);
  const [payroll, setPayroll] = React.useState(prefill.payrollNumber);
  const [approver, setApprover] = React.useState(prefill.defaultHodEmail);
  const [remarks, setRemarks] = React.useState("");
  const [email, setEmail] = React.useState(prefill.recipientEmail);
  const [reissueReason, setReissueReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (prefill.blockedReason) {
    return (
      <>
        <DialogBody>
          <p role="alert" className="text-sm">
            {prefill.blockedReason}
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  }

  const accessories = prefill.accessories.length
    ? prefill.accessories.map((a) => `${a.name} × ${a.quantity}`).join(", ")
    : "None";
  const summary: [string, string][] = [
    ["Date of issue", formatDate(prefill.issueDate)],
    ["Issued to", prefill.issuedToName],
    ["Department", prefill.department],
    ["Location", prefill.location],
    ["Type", prefill.equipmentType],
    ["Finance asset no.", prefill.financeAssetNo],
    ["Serial no.", prefill.serialNumber],
    ["Physical condition", prefill.physicalCondition],
    ["Accessories", accessories],
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = fields.validate(
      {
        make: !make.trim() && "Enter the make.",
        model: !model.trim() && "Enter the model.",
        payroll: !payroll.trim() && "Enter the payroll number.",
        approver: !approver && "Choose who approved this.",
        email:
          !prefill.recipientEmailLocked &&
          (!email.trim()
            ? "Enter the owner's email address."
            : !looksLikeEmail(email) && "Enter a valid email address."),
      },
      event.currentTarget,
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await axios.post<{
        form: { formNumber: string };
        emailSent: boolean;
      }>(`/api/assets/${assetId}/issue-forms`, {
        make,
        model,
        payrollNumber: payroll,
        approverEmail: approver,
        remarks,
        recipientEmail: prefill.recipientEmailLocked ? null : email,
        reissueReason: reissueReason || null,
      });
      onDone();
      router.refresh(() =>
        addToast(
          data.emailSent
            ? {
                title: `${data.form.formNumber} sent to ${prefill.issuedToName}`,
                variant: "success",
              }
            : {
                title: `${data.form.formNumber} saved, but the email didn't send`,
                description:
                  "Re-send it from the Issue Forms tab, or download the PDF.",
                variant: "error",
              },
        ),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody>
        <dl className="bg-muted/50 grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg p-4 sm:grid-cols-2">
          {summary.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs font-medium">
                {label}
              </dt>
              <dd className="text-sm break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-make`} className="text-sm font-medium">
              Make
              <RequiredMark />
            </label>
            <Input
              id={`${id}-make`}
              required
              maxLength={100}
              value={make}
              onChange={(e) => {
                setMake(e.target.value);
                fields.clear("make");
              }}
              {...fields.invalid("make")}
            />
            <FieldError
              id={fields.errorId("make")}
              message={fields.errors.make}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-model`} className="text-sm font-medium">
              Model
              <RequiredMark />
            </label>
            <Input
              id={`${id}-model`}
              required
              maxLength={200}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                fields.clear("model");
              }}
              {...fields.invalid("model")}
            />
            <FieldError
              id={fields.errorId("model")}
              message={fields.errors.model}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-payroll`} className="text-sm font-medium">
              Payroll no.
              <RequiredMark />
            </label>
            <Input
              id={`${id}-payroll`}
              required
              maxLength={50}
              value={payroll}
              onChange={(e) => {
                setPayroll(e.target.value);
                fields.clear("payroll");
              }}
              {...fields.invalid("payroll")}
            />
            <FieldError
              id={fields.errorId("payroll")}
              message={fields.errors.payroll}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-approver`} className="text-sm font-medium">
              Approved by
              <RequiredMark />
            </label>
            <Select
              id={`${id}-approver`}
              value={approver}
              onChange={(e) => {
                setApprover(e.target.value);
                fields.clear("approver");
              }}
              {...fields.invalid("approver")}
            >
              <option value="" disabled>
                {prefill.hods.length ? "Select a HOD" : "No HODs available"}
              </option>
              {prefill.hods.map((h) => (
                <option key={h.email} value={h.email}>
                  {h.department && h.department !== "N/A"
                    ? `${h.name} (${h.department})`
                    : h.name}
                </option>
              ))}
            </Select>
            <FieldError
              id={fields.errorId("approver")}
              message={fields.errors.approver}
            />
            {prefill.hodsStale && (
              <p className="text-muted-foreground text-xs">
                {prefill.hods.length
                  ? "The requisitions app can't be reached, so this is the last list it provided."
                  : "The requisitions app can't be reached and no earlier list is saved. Try again later."}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className="text-sm font-medium">
            Owner&apos;s email
            <RequiredMark />
          </label>
          <Input
            id={`${id}-email`}
            type="email"
            required
            maxLength={150}
            readOnly={prefill.recipientEmailLocked}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              fields.clear("email");
            }}
            {...fields.invalid("email")}
          />
          <FieldError
            id={fields.errorId("email")}
            message={fields.errors.email}
          />
          {prefill.recipientEmailLocked && (
            <p className="text-muted-foreground text-xs">
              From the owner&apos;s user account.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-remarks`} className="text-sm font-medium">
            Remarks
          </label>
          <textarea
            id={`${id}-remarks`}
            rows={2}
            maxLength={500}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className={TEXTAREA}
          />
        </div>

        {prefill.hasPriorAcknowledgement && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-reason`} className="text-sm font-medium">
              Re-issue reason
            </label>
            <Select
              id={`${id}-reason`}
              value={reissueReason}
              onChange={(e) => setReissueReason(e.target.value)}
            >
              <option value="">Not needed</option>
              {REISSUE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
            <p className="text-muted-foreground text-xs">
              {prefill.issuedToName} already acknowledged a form for this asset.
              A reason is required if nothing has changed since.
            </p>
          </div>
        )}

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
        <Button type="submit" loading={submitting}>
          {submitting ? "Sending…" : "Send form"}
        </Button>
      </DialogFooter>
    </form>
  );
}
