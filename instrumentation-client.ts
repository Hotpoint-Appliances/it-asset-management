import axios from "axios";
import { useUIStore } from "@/store";
import { BASE_PATH } from "@/lib/basePath";

// Every client axios call uses an app-relative "/api/..." URL; this prefixes them all with the
// base path. Absolute URLs are left alone. Runs before any app code on the client.
axios.defaults.baseURL = BASE_PATH || undefined;

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
