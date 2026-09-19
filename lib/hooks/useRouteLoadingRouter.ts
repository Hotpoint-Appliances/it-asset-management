"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store";

/** Drop-in replacement for `next/navigation`'s `useRouter()` that pulses the top-level route
 * progress line (`components/layout/RouteProgress.tsx`) for `push`/`replace`/`refresh` calls.
 * Those don't get automatic `loading.tsx` coverage the way a `<Link>` navigation to a new,
 * not-yet-mounted segment does — a `router.refresh()` after a mutation re-fetches data for a
 * segment that's already mounted, and a `router.push` that only changes search params
 * (`AssetsList`'s filters/pagination) does too. Wrapping the call in `useTransition` gives an
 * accurate `isPending` for exactly how long that RSC round-trip takes (see the Next.js docs on
 * `useTransition` with the router), which this syncs into the shared UI store since
 * `RouteProgress` is a separate component tree from whichever page calls this. */
export function useRouteLoadingRouter() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const startRouteLoading = useUIStore((s) => s.startRouteLoading);
  const endRouteLoading = useUIStore((s) => s.endRouteLoading);

  React.useEffect(() => {
    if (isPending) {
      startRouteLoading();
      return endRouteLoading;
    }
  }, [isPending, startRouteLoading, endRouteLoading]);

  return React.useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) =>
        startTransition(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) =>
        startTransition(() => router.replace(...args)),
      refresh: () => startTransition(() => router.refresh()),
      /** Local pending flag for the calling component's own UI (e.g. dimming a table while its
       * own filter/pagination push is in flight) — same signal already pulsed into the shared
       * store above for `RouteProgress`. */
      isPending,
    }),
    [router, isPending],
  );
}
