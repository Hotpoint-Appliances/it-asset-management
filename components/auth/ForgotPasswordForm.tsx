"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AppLogo } from "@/components/shared/AppLogo";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors, looksLikeEmail } from "@/lib/hooks/useFieldErrors";

/** Requests a reset link. The server answers the same whether or not the address has an
 * account, so the confirmation is worded to fit both. */
export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const fields = useFieldErrors<"email">();
  const sentRef = React.useRef<HTMLHeadingElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = fields.validate(
      {
        email: !email.trim()
          ? "Enter your email address."
          : !looksLikeEmail(email) && "Enter a valid email address.",
      },
      event.currentTarget,
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post("/api/auth/forgot-password", { email });
      setSentTo(email.trim());
      requestAnimationFrame(() => sentRef.current?.focus());
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        // nginx's limit_req answers with an HTML page, as on the login form.
        setError("Too many requests. Wait a minute and try again.");
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error as string);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
        <span className="bg-primary/10 text-primary mb-2 flex h-12 w-12 items-center justify-center rounded-xl">
          <MailCheck aria-hidden="true" className="h-6 w-6" />
        </span>
        <h1
          ref={sentRef}
          tabIndex={-1}
          className="text-3xl font-bold tracking-tight outline-none"
        >
          Check your email
        </h1>
        <p className="text-muted-foreground text-sm break-words">
          If <span className="text-foreground font-medium">{sentTo}</span>{" "}
          belongs to an account, a link to reset your password is on its way. It
          expires in 30 minutes.
        </p>
        <p className="text-muted-foreground text-sm">
          Nothing after a few minutes? Check your junk folder, or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            try again
          </button>
          .
        </p>
        <Button variant="outline" asChild className="mt-6 w-full">
          <Link href="/login">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <AppLogo className="mb-2 h-12 w-12" />
        <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
            <RequiredMark />
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
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
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} className="mt-1">
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
