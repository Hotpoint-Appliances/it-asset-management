import type { LucideIcon } from "lucide-react";
import {
  FolderTree,
  MapPin,
  Building2,
  Truck,
  Gauge,
  Flag,
  UsersRound,
} from "lucide-react";

export interface SettingsSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

// Single source for the settings sections: the index page and its skeleton, SettingsNav, and
// the admin entries in QuickActions all read this, so adding a section is a one-line change.
export const settingsSections: SettingsSection[] = [
  {
    href: "/settings/categories",
    label: "Categories",
    description: "Asset category hierarchy",
    icon: FolderTree,
  },
  {
    href: "/settings/locations",
    label: "Locations",
    description: "Sites, buildings, floors, rooms",
    icon: MapPin,
  },
  {
    href: "/settings/departments",
    label: "Departments",
    description: "Org departments",
    icon: Building2,
  },
  {
    href: "/settings/vendors",
    label: "Vendors",
    description: "Suppliers and repair vendors",
    icon: Truck,
  },
  {
    href: "/settings/conditions",
    label: "Conditions",
    description: "Asset condition options",
    icon: Gauge,
  },
  {
    href: "/settings/statuses",
    label: "Statuses",
    description: "Asset lifecycle statuses",
    icon: Flag,
  },
  {
    href: "/settings/users",
    label: "Users",
    description: "Accounts and roles",
    icon: UsersRound,
  },
];
