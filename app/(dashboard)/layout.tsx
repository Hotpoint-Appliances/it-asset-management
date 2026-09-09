import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return <AppShell>{children}</AppShell>;
}
