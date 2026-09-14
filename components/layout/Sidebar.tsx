"use client";

import { Boxes, ChevronsLeft, ChevronsRight } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";

export function Sidebar({ className }: { className?: string }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);

  return (
    <aside
      className={cn(
        "hidden md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col",
        "md:border-border md:bg-sidebar md:text-sidebar-foreground md:border-r",
        "transition-[width] duration-200 ease-in-out",
        collapsed ? "md:w-19" : "md:w-64",
        className,
      )}
    >
      <div
        className={cn(
          "border-border flex h-16 shrink-0 items-center gap-2 border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <div className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
          <Boxes className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold">
            IT Asset Manager
          </span>
        )}
      </div>

      <div className="scroll-area-thin flex-1 overflow-y-auto p-3">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div className="border-border shrink-0 border-t p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Expand sidebar"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium"
          >
            <ChevronsLeft className="h-4 w-4" />
            Collapse
          </button>
        )}
      </div>
    </aside>
  );
}
