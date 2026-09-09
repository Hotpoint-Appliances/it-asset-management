import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { SettingsNav } from "@/components/layout/SettingsNav";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireRole(["admin"]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage the lookup data other modules depend on.
        </p>
      </div>
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
