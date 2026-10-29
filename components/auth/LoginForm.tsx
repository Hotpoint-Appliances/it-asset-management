"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AppLogo } from "@/components/shared/AppLogo";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors, looksLikeEmail } from "@/lib/hooks/useFieldErrors";

/** Only a same-origin relative path is a safe redirect target, `from` is an attacker-controlled
 * query param (`/login?from=https://evil.com` or `//evil.com`), so anything else falls back to
 * `/` rather than being handed to `window.location`. */
function safeRedirectTarget(from: string | null): string {
  if (
    from &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    from !== "/login"
  ) {
    return from;
  }
  return "/";
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fields = useFieldErrors<"email" | "password">();
  // Set by the reset-password page after a successful reset.
  const passwordReset = searchParams.get("reset") === "1";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = fields.validate(
      {
        email: !email.trim()
          ? "Enter your email address."
          : !looksLikeEmail(email) && "Enter a valid email address.",
        password: !password && "Enter your password.",
      },
      event.currentTarget,
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);

    try {
      await axios.post("/api/auth/login", { email, password });
      // Full reload (not next/navigation) so the whole app, client state, the session context,
      // every store, starts fresh under the new session, matching the logout flow.
      window.location.assign(safeRedirectTarget(searchParams.get("from")));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        // nginx's limit_req on /api/auth/login (docs/deployment.md) answers with an HTML page,
        // so there's no JSON error to show; say what happened instead of "Something went wrong".
        setError("Too many sign-in attempts. Wait a minute and try again.");
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error as string);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <AppLogo className="mb-2 h-12 w-12" />
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your IT Asset Manager account
        </p>
      </div>
      {passwordReset && (
        <div
          role="status"
          className="border-success/40 bg-success/5 mb-6 flex gap-3 rounded-lg border p-3 text-sm"
        >
          <CheckCircle2
            aria-hidden="true"
            className="text-success mt-0.5 h-4 w-4 shrink-0"
          />
          <p>Password updated. Sign in with your new password.</p>
        </div>
      )}
      <div>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
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
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
                <RequiredMark />
              </label>
              <Link
                href="/forgot-password"
                className="text-primary text-sm font-medium underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                fields.clear("password");
              }}
              {...fields.invalid("password")}
            />
            <FieldError
              id={fields.errorId("password")}
              message={fields.errors.password}
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" loading={submitting} className="mt-1">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
