import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();
  const sidebarCollapsed =
    (await cookies()).get("itam_sidebar_collapsed")?.value === "1";
  return <AppShell sidebarCollapsed={sidebarCollapsed}>{children}</AppShell>;
}
