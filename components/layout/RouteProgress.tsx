"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUIStore } from "@/store";

/** Routes that arrive faster than this never show the line, so quick navigations don't flash. */
const SHOW_DELAY_MS = 150;
/** How long the line takes to run to the end once loading finishes, then to fade out. Both match
 * the `duration-200` on the bar. */
const FINISH_MS = 200;
const FADE_MS = 200;

/** Thin progress bar pinned to the top of the page. Two signals drive it: `navigating`, set by
 * `onRouterTransitionStart` (instrumentation-client.ts) for every navigation that leaves the
 * current URL and cleared here once the new URL has rendered; and `routeLoading`, a counter from
 * `useRouteLoadingRouter` that covers what isn't a navigation, like `router.refresh()` after a
 * mutation. The watcher below also zeroes the counter, so a start without a matching end can't
 * leave the line stuck, and records the rendered URL so a click on the current page's link can
 * be told apart from a real route change. */
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
    useUIStore.setState({ routeLoading: 0, committedRoute: routeKey });
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
      // Eases toward 85% and never reaches it, so a slow route still looks like it's moving.
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
      }, FINISH_MS + FADE_MS);
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
        className="bg-primary h-full transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `${width}%`,
          // Runs to 100% first, then fades, instead of disappearing mid-stride.
          opacity: active ? 1 : 0,
          transitionDelay: active ? undefined : `0ms, ${FINISH_MS}ms`,
        }}
      />
    </div>
  );
}
