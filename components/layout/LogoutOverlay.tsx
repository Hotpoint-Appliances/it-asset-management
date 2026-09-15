"use client";

import { Loader2 } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { useUIStore } from "@/store";

/** Mounted once at the `AppShell` level (not inside `UserMenu`'s `DropdownMenuContent` — that
 * unmounts on `onSelect`, which would take this down with it before the redirect fires) and
 * driven by the shared `loggingOut` flag so it survives the menu closing. */
export function LogoutOverlay() {
  const loggingOut = useUIStore((s) => s.loggingOut);

  if (!loggingOut) return null;

  return (
    <Portal>
      <div
        role="status"
        aria-live="polite"
        className="bg-background/80 fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
      >
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">Signing out…</p>
      </div>
    </Portal>
  );
}
