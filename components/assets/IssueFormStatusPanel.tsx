import { signatureFont } from "@/components/acknowledge/signatureFont";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  ISSUE_FORM_STATUS_LABELS,
  ISSUE_FORM_STATUS_VARIANTS,
} from "@/lib/issueForms/rules";
import type { IssueForm } from "@/types/issueForm";

function Signature({ form }: { form: IssueForm }) {
  if (!form.acknowledgedAt || !form.acknowledgedName) return null;
  return (
    <>
      <p
        className={`${signatureFont.className} text-3xl break-words`}
        aria-label={`Signed by ${form.acknowledgedName}`}
      >
        {form.acknowledgedName}
      </p>
      <p className="text-muted-foreground text-sm">
        Signed {formatDateTime(form.acknowledgedAt)} EAT
      </p>
    </>
  );
}

function Reason({ when, reason }: { when: string; reason: string | null }) {
  return (
    <>
      <p className="text-muted-foreground text-sm">{when}</p>
      {reason && <p className="text-sm break-words">{reason}</p>}
    </>
  );
}

function StatusBody({ form }: { form: IssueForm }) {
  switch (form.status) {
    case "acknowledged":
      return <Signature form={form} />;
    case "superseded":
      return (
        <>
          <Signature form={form} />
          <p className="text-muted-foreground text-sm">
            A later form has replaced this one.
          </p>
        </>
      );
    case "disputed":
      return (
        <Reason
          when={
            form.disputedAt
              ? `Reported ${formatDateTime(form.disputedAt)} EAT`
              : "The recipient reported a problem"
          }
          reason={form.disputeReason}
        />
      );
    case "voided":
      return (
        <Reason
          when={
            form.voidedAt
              ? `Voided ${formatDateTime(form.voidedAt)} EAT`
              : "This form was cancelled"
          }
          reason={form.voidReason}
        />
      );
    case "pending":
      return (
        <p className="text-muted-foreground text-sm">
          {form.emailStatus === "failed"
            ? "The email didn't send. Re-send it from the Issue Forms tab."
            : `Waiting for ${form.issuedToName} to sign. The link is open until ${formatDate(form.expiresAt)}.`}
        </p>
      );
    case "expired":
      return (
        <p className="text-muted-foreground text-sm">
          The link closed on {formatDate(form.expiresAt)} without a signature.
        </p>
      );
  }
}

/** Where a form stands, for the people managing it; the recipient's page words this for them. */
export function IssueFormStatusPanel({ form }: { form: IssueForm }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Status</h2>
          <Badge variant={ISSUE_FORM_STATUS_VARIANTS[form.status]}>
            {ISSUE_FORM_STATUS_LABELS[form.status]}
          </Badge>
        </div>
        <StatusBody form={form} />
      </CardContent>
    </Card>
  );
}
