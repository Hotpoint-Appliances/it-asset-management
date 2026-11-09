"use client";

import * as React from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/shared/FieldError";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { useFieldErrors } from "@/lib/hooks/useFieldErrors";
import { normalizeName } from "@/lib/issueForms/rules";
import { signatureFont } from "./signatureFont";

type Field = "typedName" | "accepted" | "reason";

function failureMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    // nginx's limit_req answers with an HTML page, as on the login form.
    if (err.response?.status === 429) {
      return "Too many attempts. Wait a minute and try again.";
    }
    if (err.response?.data?.error) return err.response.data.error as string;
  }
  return "Something went wrong. Please try again.";
}

/** The signing panel. Typing the printed name plus the tick is the acknowledgement; the cursive
 * rendering is only how it looks. Either outcome reloads into the page's read-only state. */
export function AcknowledgeForm({
  token,
  issuedToName,
}: {
  token: string;
  issuedToName: string;
}) {
  const [mode, setMode] = React.useState<"sign" | "report">("sign");
  const [typedName, setTypedName] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fields = useFieldErrors<Field>();
  const reportRef = React.useRef<HTMLTextAreaElement>(null);

  async function send(url: string, payload: object) {
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(url, { token, ...payload });
      // Full reload: the server decides what this link shows from now on.
      window.location.reload();
    } catch (err) {
      setError(failureMessage(err));
      setSubmitting(false);
    }
  }

  function handleSign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = fields.validate(
      {
        typedName: !typedName.trim()
          ? "Type your full name."
          : normalizeName(typedName) !== normalizeName(issuedToName) &&
            `Type your name exactly as it appears on the form: ${issuedToName}.`,
        accepted: !accepted && "Tick the box to accept the terms.",
      },
      event.currentTarget,
    );
    if (ok) void send("/api/acknowledge", { typedName, accepted });
  }

  function handleReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = fields.validate(
      { reason: !reason.trim() && "Describe what's wrong." },
      event.currentTarget,
    );
    if (ok) void send("/api/acknowledge/dispute", { reason });
  }

  function switchMode(next: "sign" | "report") {
    setMode(next);
    setError(null);
    fields.reset();
    if (next === "report") {
      requestAnimationFrame(() => reportRef.current?.focus());
    }
  }

  const errorBlock = error && (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  );

  if (mode === "report") {
    return (
      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={handleReport}
            noValidate
            className="flex flex-col gap-4"
          >
            <h2 className="text-sm font-semibold">Report a problem</h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ack-reason" className="text-sm font-medium">
                What&apos;s wrong with this form?
                <RequiredMark />
              </label>
              <textarea
                id="ack-reason"
                ref={reportRef}
                required
                rows={4}
                maxLength={1000}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  fields.clear("reason");
                }}
                placeholder="For example, I haven't received this laptop."
                {...fields.invalid("reason")}
                className="border-border bg-background focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
              <FieldError
                id={fields.errorId("reason")}
                message={fields.errors.reason}
              />
            </div>
            {errorBlock}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => switchMode("sign")}
              >
                Back
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Sending…" : "Send report"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSign} noValidate className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Acknowledge receipt</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ack-name" className="text-sm font-medium">
              Type your full name to sign
              <RequiredMark />
            </label>
            <Input
              id="ack-name"
              required
              autoComplete="name"
              placeholder={issuedToName}
              value={typedName}
              onChange={(e) => {
                setTypedName(e.target.value);
                fields.clear("typedName");
              }}
              {...fields.invalid("typedName")}
            />
            <FieldError
              id={fields.errorId("typedName")}
              message={fields.errors.typedName}
            />
          </div>
          <div
            aria-hidden="true"
            className={`${signatureFont.className} border-border text-foreground flex min-h-16 items-center rounded-lg border border-dashed px-4 text-3xl break-all`}
          >
            {typedName.trim()}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex min-h-11 items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                required
                checked={accepted}
                onChange={(e) => {
                  setAccepted(e.target.checked);
                  fields.clear("accepted");
                }}
                {...fields.invalid("accepted")}
                className="accent-primary mt-0.5 h-4 w-4 shrink-0"
              />
              <span>
                I confirm I have received the equipment and accessories listed
                above, and I accept the terms of the disclaimer. I understand
                that typing my name serves as my electronic signature.
              </span>
            </label>
            <FieldError
              id={fields.errorId("accepted")}
              message={fields.errors.accepted}
            />
          </div>
          {errorBlock}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => switchMode("report")}
            >
              Report a problem
            </Button>
            <Button type="submit" loading={submitting}>
              {submitting ? "Signing…" : "Acknowledge and sign"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
