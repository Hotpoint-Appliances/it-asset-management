"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

/** Only a same-origin relative path is a safe redirect target — `from` is an attacker-controlled
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await axios.post("/api/auth/login", { email, password });
      // Full reload (not next/navigation) so the whole app — client state, the session context,
      // every store — starts fresh under the new session, matching the logout flow.
      window.location.assign(safeRedirectTarget(searchParams.get("from")));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error as string);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-md">
      <CardHeader className="items-center text-center">
        <div className="bg-primary/10 text-primary mb-1 flex h-11 w-11 items-center justify-center rounded-xl">
          <Boxes className="h-5 w-5" />
        </div>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to your IT Asset Manager account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
