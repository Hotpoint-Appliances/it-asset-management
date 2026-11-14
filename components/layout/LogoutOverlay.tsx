"use client";

import * as React from "react";
import { SignOutIcon } from "@phosphor-icons/react/ssr";
import { Portal } from "@/components/ui/Portal";
import { AppLogo } from "@/components/shared/AppLogo";
import { useUIStore } from "@/store";

/** Mounted once at the `AppShell` level (not inside `UserMenu`'s `DropdownMenuContent`, that
 * unmounts on `onSelect`, which would take this down with it before the redirect fires) and
 * driven by the shared `loggingOut` flag so it survives the menu closing. */
export function LogoutOverlay() {
  const loggingOut = useUIStore((s) => s.loggingOut);

  if (!loggingOut) return null;

  return (
    <Portal>
      <LogoutScreen />
    </Portal>
  );
}

function LogoutScreen() {
  const ref = React.useRef<HTMLDivElement>(null);

  // Lock the page underneath: the overlay already covers it for the pointer, but focus and
  // keyboard scrolling would still reach it. `inert` on every other top-level node blocks
  // both (and hides them from assistive tech); undone if sign-out fails and this unmounts.
  React.useEffect(() => {
    const self = ref.current;
    if (!self) return;
    (document.activeElement as HTMLElement | null)?.blur();
    const locked = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && !el.contains(self) && !el.inert,
    );
    locked.forEach((el) => (el.inert = true));
    return () => locked.forEach((el) => (el.inert = false));
  }, []);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="bg-background fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <AppLogo className="h-12 w-12" />
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="text-primary absolute inset-0 h-full w-full"
        >
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            // ~30% of the 176px circumference, so it reads as an arc chasing the track.
            strokeDasharray="52 176"
            className="origin-center animate-spin [animation-duration:0.9s]"
          />
        </svg>
        <SignOutIcon
          weight="bold"
          className="text-primary h-6 w-6 translate-x-px"
          aria-hidden="true"
        />
      </div>
      <p className="text-sm font-medium">Signing out…</p>
    </div>
  );
}
