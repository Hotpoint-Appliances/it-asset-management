"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";

/** Error boundary for every dashboard route. It sits *inside* app/(dashboard)/layout.tsx, so the
 * sidebar/topbar stay usable while one page has failed. Next 16.3's error components get
 * `retry` (re-fetches and re-renders the segment); prefer it over the older `reset`. */
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <ErrorFallback error={error} retry={retry} />
    </div>
  );
}
