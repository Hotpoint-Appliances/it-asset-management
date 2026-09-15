"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { useSession } from "@/lib/auth/session-context";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const session = useSession();
  const visibleItems = navItems.filter(
    (item) => !item.roles || (session && item.roles.includes(session.roleName)),
  );

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {visibleItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const content = (
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 min-w-0 items-center gap-3 rounded-lg text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3 py-2",
              active
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );

        if (!collapsed) {
          return <div key={item.href}>{content}</div>;
        }

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
