"use client";

import * as React from "react";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import "./globals.css";

/** Last-resort boundary: replaces the root layout when *it* fails, e.g. the database is down,
 * since app/layout.tsx resolves the session (a DB lookup) before rendering anything. It renders
 * its own document, so it gets no ThemeProvider: apply next-themes' saved choice (localStorage
 * "theme", class attribute) or the OS preference before paint, so the page matches the app. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  React.useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("theme");
    } catch {
      // Storage can be unavailable (privacy mode); fall back to the OS preference.
    }
    const dark =
      stored === "dark" ||
      ((stored === null || stored === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-dvh items-center justify-center p-4">
        <title>Something went wrong · IT Asset Manager</title>
        {/* No dashboard link: the root layout itself failed, so "/" would fail the same way. */}
        <ErrorFallback error={error} retry={retry} showHomeLink={false} />
      </body>
    </html>
  );
}
