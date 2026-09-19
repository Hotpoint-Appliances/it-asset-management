import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Boxes, FileBarChart, Settings } from "lucide-react";
import type { RoleName } from "@/lib/auth/session";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Omit to show to every role; RBAC per phase-2-auth restricts admin-only sections. */
  roles?: RoleName[];
}

// Categories/Locations/Departments/Users live under Settings (phase-3-core-data) rather than as
// their own top-level items — keeps the sidebar from growing one entry per lookup table.
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Assets", href: "/assets", icon: Boxes },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];
