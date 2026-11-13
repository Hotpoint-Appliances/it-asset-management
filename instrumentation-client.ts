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
  const store = useUIStore.getState();

  // A navigation that stays on the URL already shown (clicking the current page's link, a
  // hash-only change) renders nothing new, so `RouteProgress` would never see it finish. It also
  // supersedes any navigation still in flight, so that one's line is cleared rather than left
  // running until the timeout.
  if (routeKey(url, navigationType) === currentRoute(store.committedRoute)) {
    store.endNavigation();
    return;
  }

  store.startNavigation();
}

/** `pathname?search` of a navigation target, base path excluded, in the same shape
 * `RouteProgress` builds from `usePathname()`/`useSearchParams()`. */
function routeKey(url: string, navigationType: string): string {
  const target = new URL(url, window.location.href);
  // `push`/`replace` get the href as the app wrote it (`/assets`), before Next adds the base
  // path; back/forward gets the full browser URL, which includes it.
  const pathname =
    navigationType === "traverse" ? stripBasePath(target.pathname) : target.pathname;
  return `${pathname}?${new URLSearchParams(target.search).toString()}`;
}

function currentRoute(committed: string | null): string {
  if (committed !== null) return committed;
  return `${stripBasePath(window.location.pathname)}?${new URLSearchParams(window.location.search).toString()}`;
}

function stripBasePath(pathname: string): string {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  return pathname.startsWith(`${BASE_PATH}/`)
    ? pathname.slice(BASE_PATH.length)
    : pathname;
}
