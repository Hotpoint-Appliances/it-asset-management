"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsNavItems = [
  { label: "Categories", href: "/settings/categories" },
  { label: "Locations", href: "/settings/locations" },
  { label: "Departments", href: "/settings/departments" },
  { label: "Vendors", href: "/settings/vendors" },
  { label: "Conditions", href: "/settings/conditions" },
  { label: "Statuses", href: "/settings/statuses" },
  { label: "Users", href: "/settings/users" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border scroll-area-thin flex gap-1 overflow-x-auto border-b">
      {settingsNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "min-h-11 shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
