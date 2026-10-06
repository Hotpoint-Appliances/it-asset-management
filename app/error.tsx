"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";

/** Error boundary for the routes outside the dashboard shell (/login, /403). Dashboard routes
 * have their own, inside the shell (app/(dashboard)/error.tsx); a failure in the root layout
 * itself lands in app/global-error.tsx. */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorFallback error={error} retry={retry} />
    </div>
  );
}
