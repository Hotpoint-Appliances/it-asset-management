import {
  ChartBarIcon,
  GearIcon,
  PackageIcon,
  SignatureIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { RoleName } from "@/lib/auth/session";

export interface NavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
  /** Omit to show to every role; RBAC per phase-2-auth restricts admin-only sections. */
  roles?: RoleName[];
}

// Categories/Locations/Departments/Users live under Settings (phase-3-core-data) rather than as
// their own top-level items, keeps the sidebar from growing one entry per lookup table.
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: SquaresFourIcon },
  { label: "Assets", href: "/assets", icon: PackageIcon },
  {
    label: "Issue forms",
    href: "/issue-forms",
    icon: SignatureIcon,
    roles: ["admin", "asset_manager"],
  },
  { label: "Reports", href: "/reports", icon: ChartBarIcon },
  { label: "Settings", href: "/settings", icon: GearIcon, roles: ["admin"] },
];
