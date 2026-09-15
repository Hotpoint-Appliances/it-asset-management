import Link from "next/link";
import {
  FolderTree,
  MapPin,
  Building2,
  Truck,
  Gauge,
  Flag,
  UsersRound,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { LinkProgress } from "@/components/layout/LinkProgress";

const sections = [
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

export default function SettingsIndexPage() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <Link key={section.href} href={section.href}>
          <Card className="hover:bg-muted/50 h-full transition-colors">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <section.icon className="text-muted-foreground h-5 w-5" />
              <div>
                <CardTitle className="text-base">{section.label}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
          <LinkProgress />
        </Link>
      ))}
    </div>
  );
}
