"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { StandalonePage } from "@/components/shared/StandalonePage";

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
    <StandalonePage>
      <ErrorFallback error={error} retry={retry} />
    </StandalonePage>
  );
}
