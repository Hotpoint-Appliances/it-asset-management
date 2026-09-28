"use client";

import { SidebarNav } from "./SidebarNav";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/shared/AppLogo";

export function Sidebar({
  className,
  defaultCollapsed = false,
}: {
  className?: string;
  defaultCollapsed?: boolean;
}) {
  const stored = useUIStore((s) => s.sidebarCollapsed);
  const collapsed = stored ?? defaultCollapsed;

  return (
    <aside
      className={cn(
        "nav:flex nav:h-full nav:shrink-0 nav:flex-col hidden",
        "nav:border-border nav:bg-sidebar nav:text-sidebar-foreground nav:border-r",
        collapsed ? "nav:w-19" : "nav:w-64",
        className,
      )}
    >
      <div
        className={cn(
          "border-border flex h-16 shrink-0 items-center gap-2 border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <AppLogo />
        {!collapsed && (
          <span className="truncate text-sm font-semibold">
            IT Asset Manager
          </span>
        )}
      </div>

      <div className="scroll-area-thin flex-1 overflow-x-hidden overflow-y-auto p-3">
        <SidebarNav collapsed={collapsed} />
      </div>
    </aside>
  );
}
