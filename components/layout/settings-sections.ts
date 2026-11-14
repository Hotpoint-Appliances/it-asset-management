import {
  BuildingsIcon,
  FlagIcon,
  GaugeIcon,
  MapPinIcon,
  PlugIcon,
  TreeStructureIcon,
  TruckIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

export interface SettingsSection {
  href: string;
  label: string;
  description: string;
  icon: PhosphorIcon;
}

// Single source for the settings sections: the index page and its skeleton, SettingsNav, and
// the admin entries in QuickActions all read this, so adding a section is a one-line change.
export const settingsSections: SettingsSection[] = [
  {
    href: "/settings/categories",
    label: "Categories",
    description: "Asset category hierarchy",
    icon: TreeStructureIcon,
  },
  {
    href: "/settings/locations",
    label: "Locations",
    description: "Sites, buildings, floors, rooms",
    icon: MapPinIcon,
  },
  {
    href: "/settings/departments",
    label: "Departments",
    description: "Org departments",
    icon: BuildingsIcon,
  },
  {
    href: "/settings/vendors",
    label: "Vendors",
    description: "Suppliers and repair vendors",
    icon: TruckIcon,
  },
  {
    href: "/settings/conditions",
    label: "Conditions",
    description: "Asset condition options",
    icon: GaugeIcon,
  },
  {
    href: "/settings/statuses",
    label: "Statuses",
    description: "Asset lifecycle statuses",
    icon: FlagIcon,
  },
  {
    href: "/settings/accessories",
    label: "Accessories",
    description: "Accessories attachable to assets",
    icon: PlugIcon,
  },
  {
    href: "/settings/users",
    label: "Users",
    description: "Accounts and roles",
    icon: UsersIcon,
  },
];
