import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { SettingsNav } from "@/components/layout/SettingsNav";
import { RefreshButton } from "@/components/shared/RefreshButton";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["admin"]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage the lookup data other modules depend on.
          </p>
        </div>
        <RefreshButton />
      </div>
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
