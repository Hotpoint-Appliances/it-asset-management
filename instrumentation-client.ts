import { useUIStore } from "@/store";

/** Runs for every App Router navigation (`<Link>`, `router.push`/`replace`, back/forward), so the
 * route progress line needs no wiring at each call site. */
export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  // Back/forward passes the URL after the browser has already moved to it, so there's nothing to
  // compare against.
  if (navigationType !== "traverse") {
    const target = new URL(url, window.location.href);
    // A same-URL or hash-only navigation never changes the route, so the line would never finish.
    if (
      target.pathname === window.location.pathname &&
      target.search === window.location.search
    ) {
      return;
    }
  }

  useUIStore.getState().startNavigation();
}
