import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Boxes,
  FolderTree,
  MapPin,
  Building2,
  FileBarChart,
  Settings,
  UsersRound,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Assets", href: "/assets", icon: Boxes },
  { label: "Categories", href: "/categories", icon: FolderTree },
  { label: "Locations", href: "/locations", icon: MapPin },
  { label: "Departments", href: "/departments", icon: Building2 },
  { label: "Users", href: "/users", icon: UsersRound },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Settings", href: "/settings", icon: Settings },
];
