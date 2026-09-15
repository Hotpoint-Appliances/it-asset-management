"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUIStore } from "@/store";

/** Thin progress bar pinned to the top of the app shell, driven by `routeLoading` (a counter, see
 * `store/index.ts`). Two things push it: `LinkProgress` (mounted inside a `<Link>`, via Next's
 * `useLinkStatus`) and `useRouteLoadingRouter` (a `useRouter()` drop-in for programmatic
 * push/replace/refresh). The pathname/search-param watcher below is a safety net only — if a
 * route actually finished changing, the counter must not stay stuck above zero because some
 * caller's start wasn't matched by an end. */
export function RouteProgress() {
  const routeLoading = useUIStore((s) => s.routeLoading);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = React.useState(false);
  const [width, setWidth] = React.useState(0);

  const routeKey = `${pathname}?${searchParams.toString()}`;

  React.useEffect(() => {
    useUIStore.setState({ routeLoading: 0 });
  }, [routeKey]);

  // Adjusting state during render (React-documented pattern, and the same one
  // `useSyncOnOpen` uses) for the start/complete edges, so the effect below only ever
  // schedules timers — it never calls setState synchronously in its own body, just from
  // timer callbacks that fire later. A ref can't stand in for `prevLoading` here since
  // reading/writing a ref during render is itself disallowed.
  const [prevLoading, setPrevLoading] = React.useState(0);
  if (routeLoading !== prevLoading) {
    setPrevLoading(routeLoading);
    if (routeLoading > 0 && prevLoading === 0) {
      setVisible(true);
      setWidth(15);
    } else if (routeLoading === 0 && prevLoading > 0) {
      setWidth(100);
    }
  }

  React.useEffect(() => {
    if (routeLoading > 0) {
      const grow = setInterval(() => {
        setWidth((w) => (w < 85 ? w + (85 - w) * 0.15 : w));
      }, 200);
      return () => clearInterval(grow);
    }

    if (visible) {
      const hide = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 200);
      return () => clearTimeout(hide);
    }
  }, [routeLoading, visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.75 overflow-hidden"
    >
      <div
        className="bg-primary h-full transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
