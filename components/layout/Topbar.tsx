"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";
import { QuickActions } from "./QuickActions";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/shared/AppLogo";
import {
  SidebarCollapsedIcon,
  SidebarExpandedIcon,
} from "@/components/shared/SidebarIcons";

/** Mirrors `--breakpoint-nav` in globals.css, where the persistent sidebar takes over from the
 * drawer. */
const NAV_BREAKPOINT_QUERY = "(min-width: 75rem)";

export function Topbar({
  className,
  defaultCollapsed = false,
}: {
  className?: string;
  defaultCollapsed?: boolean;
}) {
  const router = useRouter();
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const stored = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const collapsed = stored ?? defaultCollapsed;

  // Widening past the breakpoint hides the hamburger but not an already-open drawer (it's a
  // portal, outside the `nav:hidden` trigger), so close it rather than leave it over the sidebar.
  React.useEffect(() => {
    const mql = window.matchMedia(NAV_BREAKPOINT_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileNavOpen(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [setMobileNavOpen]);

  return (
    <header
      className={cn(
        "border-border bg-background/95 z-40 flex h-16 shrink-0 items-center gap-2 border-b px-4 supports-backdrop-filter:backdrop-blur",
        className,
      )}
    >
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="nav:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetTitle className="flex items-center gap-2">
            <AppLogo />
            IT Asset Manager
          </SheetTitle>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <Button
        variant="ghost"
        size="icon"
        className="nav:inline-flex hidden"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setSidebarCollapsed(!collapsed)}
      >
        {collapsed ? <SidebarCollapsedIcon /> : <SidebarExpandedIcon />}
      </Button>

      <div className="flex flex-1 justify-center">
        <QuickActions />
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
