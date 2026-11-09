"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUIStore } from "@/store";

/** Routes that arrive faster than this never show the line, so quick navigations don't flash. */
const SHOW_DELAY_MS = 150;

/** Thin progress bar pinned to the top of the page. Two signals drive it: `navigating`, set for
 * every navigation by `onRouterTransitionStart` (instrumentation-client.ts) and cleared here once
 * the new URL has rendered; and `routeLoading`, a counter from `useRouteLoadingRouter` that covers
 * what isn't a navigation, like `router.refresh()` after a mutation. The watcher below also zeroes
 * the counter, so a start without a matching end can't leave the line stuck. */
export function RouteProgress() {
  const routeLoading = useUIStore((s) => s.routeLoading);
  const navigating = useUIStore((s) => s.navigating);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = React.useState(false);
  const [width, setWidth] = React.useState(0);

  const active = routeLoading > 0 || navigating;
  const routeKey = `${pathname}?${searchParams.toString()}`;

  React.useEffect(() => {
    useUIStore.getState().endNavigation();
    useUIStore.setState({ routeLoading: 0 });
  }, [routeKey]);

  // Adjusting state during render (React-documented pattern, and the same one `useSyncOnOpen`
  // uses) for the start/complete edges, so the effect below only ever schedules timers. A ref
  // can't stand in for `prevActive` here since reading/writing a ref during render is disallowed.
  const [prevActive, setPrevActive] = React.useState(false);
  if (active !== prevActive) {
    setPrevActive(active);
    if (visible) setWidth(active ? 15 : 100);
  }

  React.useEffect(() => {
    if (active) {
      const show = setTimeout(() => {
        setVisible(true);
        setWidth((w) => w || 15);
      }, SHOW_DELAY_MS);
      const grow = setInterval(() => {
        setWidth((w) => (w > 0 && w < 85 ? w + (85 - w) * 0.15 : w));
      }, 200);
      return () => {
        clearTimeout(show);
        clearInterval(grow);
      };
    }

    if (visible) {
      const hide = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 200);
      return () => clearTimeout(hide);
    }
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-[0.15rem] overflow-hidden"
    >
      <div
        className="bg-primary h-full transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
