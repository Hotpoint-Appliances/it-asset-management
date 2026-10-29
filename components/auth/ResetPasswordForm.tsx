"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AppLogo } from "@/components/shared/AppLogo";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors } from "@/lib/hooks/useFieldErrors";

type Field = "newPassword" | "confirmPassword";

const MIN_LENGTH = 8;

/** Shown for a missing, used or expired link, both up front (the page checks the token) and
 * when the server rejects it on submit. */
export function ResetLinkInvalid() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
      <span className="bg-destructive/10 text-destructive mb-2 flex h-12 w-12 items-center justify-center rounded-xl">
        <LinkIcon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">Link expired</h1>
      <p className="text-muted-foreground text-sm">
        This reset link is invalid, has already been used, or is more than 30
        minutes old. Request a new one to continue.
      </p>
      <Button asChild className="mt-6 w-full">
        <Link href="/forgot-password">Request a new link</Link>
      </Button>
      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}

/** Sets a new password from an emailed link. On success every session is signed out, so it
 * reloads into the sign-in page, which confirms the change. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [values, setValues] = React.useState<Record<Field, string>>({
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState(false);
  const fields = useFieldErrors<Field>();

  function set(name: Field, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    fields.clear(name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { newPassword, confirmPassword } = values;
    const ok = fields.validate(
      {
        newPassword: !newPassword
          ? "Enter a new password."
          : newPassword.length < MIN_LENGTH &&
            `Use at least ${MIN_LENGTH} characters.`,
        confirmPassword: !confirmPassword
          ? "Re-enter the new password."
          : confirmPassword !== newPassword && "Passwords don't match.",
      },
      event.currentTarget,
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post("/api/auth/reset-password", { token, newPassword });
      // Full reload: this browser's session (if any) was just revoked too.
      window.location.replace("/login?reset=1");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        // nginx's limit_req answers with an HTML page, as on the login form.
        setError("Too many attempts. Wait a minute and try again.");
      } else if (
        axios.isAxiosError(err) &&
        err.response?.data?.code === "invalid_token"
      ) {
        setExpired(true);
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error as string);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  if (expired) return <ResetLinkInvalid />;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <AppLogo className="mb-2 h-12 w-12" />
        <h1 className="text-3xl font-bold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-muted-foreground text-sm">
          You&apos;ll be signed out everywhere and can then sign in with it.
        </p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium">
            New password
            <RequiredMark />
          </label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            required
            value={values.newPassword}
            onChange={(e) => set("newPassword", e.target.value)}
            {...fields.invalid("newPassword")}
            aria-describedby={[
              fields.invalid("newPassword")["aria-describedby"],
              "newPassword-hint",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <p id="newPassword-hint" className="text-muted-foreground text-xs">
            At least {MIN_LENGTH} characters.
          </p>
          <FieldError
            id={fields.errorId("newPassword")}
            message={fields.errors.newPassword}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm new password
            <RequiredMark />
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            value={values.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            {...fields.invalid("confirmPassword")}
          />
          <FieldError
            id={fields.errorId("confirmPassword")}
            message={fields.errors.confirmPassword}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} className="mt-1">
          {submitting ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
