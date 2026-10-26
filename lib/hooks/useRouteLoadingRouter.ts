"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store";

/** Drop-in replacement for `next/navigation`'s `useRouter()` that pulses the top-level route
 * progress line (`components/layout/RouteProgress.tsx`) for `push`/`replace`/`refresh` calls.
 * Those don't get automatic `loading.tsx` coverage the way a `<Link>` navigation to a new,
 * not-yet-mounted segment does, a `router.refresh()` after a mutation re-fetches data for a
 * segment that's already mounted, and a `router.push` that only changes search params
 * (`AssetsList`'s filters/pagination) does too. Wrapping the call in `useTransition` gives an
 * accurate `isPending` for exactly how long that RSC round-trip takes (see the Next.js docs on
 * `useTransition` with the router), which this syncs into the shared UI store since
 * `RouteProgress` is a separate component tree from whichever page calls this.
 *
 * Each method also takes an optional `onSettled` callback, run once that transition finishes, so
 * a mutation's success toast lands alongside the refreshed data instead of ahead of the progress
 * line. If the calling component unmounts first (a `push` to another page commits, unmounting
 * the caller), queued callbacks run on unmount, since that unmount *is* the navigation settling. */
export function useRouteLoadingRouter() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const startRouteLoading = useUIStore((s) => s.startRouteLoading);
  const endRouteLoading = useUIStore((s) => s.endRouteLoading);
  const settledCallbacks = React.useRef<(() => void)[]>([]);

  React.useEffect(() => {
    if (isPending) {
      startRouteLoading();
      return endRouteLoading;
    }
  }, [isPending, startRouteLoading, endRouteLoading]);

  React.useEffect(() => {
    if (!isPending) flush(settledCallbacks.current);
  }, [isPending]);

  React.useEffect(() => {
    const callbacks = settledCallbacks.current;
    return () => flush(callbacks);
  }, []);

  return React.useMemo(() => {
    function run(action: () => void, onSettled?: () => void) {
      if (onSettled) settledCallbacks.current.push(onSettled);
      startTransition(action);
    }

    return {
      ...router,
      push: (
        href: string,
        options?: Parameters<typeof router.push>[1],
        onSettled?: () => void,
      ) => run(() => router.push(href, options), onSettled),
      replace: (
        href: string,
        options?: Parameters<typeof router.replace>[1],
        onSettled?: () => void,
      ) => run(() => router.replace(href, options), onSettled),
      refresh: (onSettled?: () => void) =>
        run(() => router.refresh(), onSettled),
      /** Local pending flag for the calling component's own UI (e.g. dimming a table while its
       * own filter/pagination push is in flight), same signal already pulsed into the shared
       * store above for `RouteProgress`. */
      isPending,
    };
  }, [router, isPending]);
}

/** Drains `callbacks` in place (the array is the ref's own, shared with later pushes). */
function flush(callbacks: (() => void)[]) {
  for (const callback of callbacks.splice(0)) callback();
}
