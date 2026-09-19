"use client";

import * as React from "react";
import { useLinkStatus } from "next/link";
import { useUIStore } from "@/store";

/** Render as a child of a `<Link>` to pulse the top-level `RouteProgress` bar while that link's
 * navigation is pending (Next's `useLinkStatus`, only readable from inside the `<Link>` it
 * belongs to). Renders nothing visible (`hidden` — not `display:none` via a class Tailwind might
 * purge differently, just the plain attribute) so it has zero layout impact wherever it's
 * dropped. */
export function LinkProgress() {
  const { pending } = useLinkStatus();
  const startRouteLoading = useUIStore((s) => s.startRouteLoading);
  const endRouteLoading = useUIStore((s) => s.endRouteLoading);

  React.useEffect(() => {
    if (pending) {
      startRouteLoading();
      return endRouteLoading;
    }
  }, [pending, startRouteLoading, endRouteLoading]);

  return <span hidden aria-hidden />;
}
