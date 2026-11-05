import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** ms before auto-dismiss; 0 or a "loading" variant means it never auto-dismisses. */
  duration?: number;
  /** How many times it has fired while on screen, shown as a pill from 2 up. */
  count: number;
  firedAt: number;
}

/** The most shown at once, so a burst can't fill the screen. The oldest goes first. */
const MAX_TOASTS = 4;

/** A repeat this soon is one event firing twice (React runs effects twice in development), not
 * something the user did again, so it doesn't add to the count. */
const SAME_EVENT_WINDOW_MS = 300;

/** Repeating a toast still on screen replaces it, with a new id so it comes back as the newest
 * with its full time, and adds to its count rather than stacking copies. A "loading" toast is
 * tied to work in progress, so it never merges and is never evicted. */
function withToast(
  toasts: Toast[],
  toast: Omit<Toast, "id" | "count" | "firedAt">,
  id: string,
): Toast[] {
  const firedAt = Date.now();
  const isLoading = (t: { variant?: ToastVariant }) => t.variant === "loading";
  const isSame = (t: Toast) =>
    !isLoading(t) &&
    (t.variant ?? "info") === (toast.variant ?? "info") &&
    t.title === toast.title &&
    t.description === toast.description;
  const repeated = toasts.find(isSame);
  const isSameEvent =
    repeated && firedAt - repeated.firedAt < SAME_EVENT_WINDOW_MS;

  const next = [
    ...toasts.filter((t) => !isSame(t)),
    {
      ...toast,
      id,
      firedAt,
      count: (repeated?.count ?? 0) + (isSameEvent ? 0 : 1),
    },
  ];
  let excess = next.filter((t) => !isLoading(t)).length - MAX_TOASTS;
  return next.filter((t) => isLoading(t) || excess-- <= 0);
}

function generateId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

const SIDEBAR_COOKIE = "itam_sidebar_collapsed";

/** Clears the progress line if a navigation never completes (failed, or cancelled by another). */
const NAVIGATION_TIMEOUT_MS = 15_000;
let navigationTimer: ReturnType<typeof setTimeout> | undefined;

interface UIState {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** null = not toggled yet this session; the server-rendered default applies. */
  sidebarCollapsed: boolean | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id" | "count" | "firedAt">) => string;
  removeToast: (id: string) => void;
  /** Counter, not a boolean — overlapping route-progress signals (a `<Link>` navigation and a
   * `router.refresh()` firing close together) must not cancel each other out early. */
  routeLoading: number;
  startRouteLoading: () => void;
  endRouteLoading: () => void;
  /** A navigation has started and its URL hasn't rendered yet (see instrumentation-client.ts). */
  navigating: boolean;
  startNavigation: () => void;
  endNavigation: () => void;
  loggingOut: boolean;
  setLoggingOut: (loggingOut: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  sidebarCollapsed: null,
  setSidebarCollapsed: (collapsed) => {
    if (typeof document !== "undefined") {
      document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    }
    set({ sidebarCollapsed: collapsed });
  },
  toasts: [],
  addToast: (toast) => {
    const id = generateId();
    set((state) => ({ toasts: withToast(state.toasts, toast, id) }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  routeLoading: 0,
  startRouteLoading: () =>
    set((state) => ({ routeLoading: state.routeLoading + 1 })),
  endRouteLoading: () =>
    set((state) => ({ routeLoading: Math.max(0, state.routeLoading - 1) })),
  navigating: false,
  startNavigation: () => {
    clearTimeout(navigationTimer);
    navigationTimer = setTimeout(
      () => set({ navigating: false }),
      NAVIGATION_TIMEOUT_MS,
    );
    set({ navigating: true });
  },
  endNavigation: () => {
    clearTimeout(navigationTimer);
    set({ navigating: false });
  },
  loggingOut: false,
  setLoggingOut: (loggingOut) => set({ loggingOut }),
}));
