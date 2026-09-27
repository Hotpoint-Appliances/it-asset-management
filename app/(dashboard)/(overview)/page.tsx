import { Boxes, CheckCircle2, Wrench, ShieldAlert } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import {
  getFleetOverview,
  listWarrantyExpiring,
  listRecentActivity,
  listAssetsInRepair,
} from "@/lib/db/dashboard";
import { getWarrantyWindows } from "@/lib/db/systemSettings";
import { StatTile } from "@/components/dashboard/StatTile";
import {
  BarBreakdown,
  type BarItem,
} from "@/components/dashboard/BarBreakdown";
import { WarrantyExpiringCard } from "@/components/dashboard/WarrantyExpiringCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { InRepairCard } from "@/components/dashboard/InRepairCard";

/** Bar color per status, defined once here (like lib/badgeVariants.ts for badges); a status an
 * admin adds later falls back to the neutral bar. */
const STATUS_BAR: Record<string, string> = {
  active: "bg-success",
  in_repair: "bg-warning",
  lost: "bg-destructive",
  stolen: "bg-destructive",
  disposed: "bg-muted-foreground/40",
};

/** Fleet dashboard (phase-6). Every widget's data comes from lib/db/dashboard.ts, which scopes
 * to the session user's department for viewers in SQL, so nothing here filters by role. */
export default async function DashboardPage() {
  const session = await requireSession();
  const windows = await getWarrantyWindows();
  const [overview, warranty, activity, repairs] = await Promise.all([
    getFleetOverview(session),
    listWarrantyExpiring(windows[windows.length - 1], session),
    listRecentActivity(session, 8),
    listAssetsInRepair(session),
  ]);

  const inRepair =
    overview.byStatus.find((s) => s.name === "in_repair")?.count ?? 0;
  const statusBars: BarItem[] = overview.byStatus.map((s) => ({
    ...s,
    barClass: STATUS_BAR[s.name] ?? "bg-primary",
    href: `/assets?statusId=${s.id}`,
  }));
  const categoryBars: BarItem[] = overview.byCategory.map((c) => ({
    ...c,
    href: `/assets?categoryId=${c.id}`,
  }));
  const departmentBars: BarItem[] = overview.byDepartment.map((d) => ({
    ...d,
    href: `/assets?departmentId=${d.id}`,
  }));
  const expiringSoon = warranty.filter(
    (w) => w.daysRemaining <= windows[0],
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {session.roleName === "viewer"
            ? "Fleet overview for your department."
            : "Fleet overview across all departments."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total assets"
          value={overview.total}
          icon={Boxes}
          href="/assets"
        />
        <StatTile
          label="In service"
          value={overview.inService}
          icon={CheckCircle2}
        />
        <StatTile
          label="In repair"
          value={inRepair}
          icon={Wrench}
          tone={inRepair > 0 ? "warning" : "default"}
        />
        <StatTile
          label={`Warranty ≤ ${windows[0]}d`}
          value={expiringSoon}
          icon={ShieldAlert}
          tone={expiringSoon > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarBreakdown title="Assets by status" items={statusBars} />
        <BarBreakdown title="Assets by category" items={categoryBars} />
        <BarBreakdown title="Assets by department" items={departmentBars} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WarrantyExpiringCard items={warranty} windows={windows} />
        <InRepairCard items={repairs} />
      </div>

      <RecentActivityCard items={activity} />
    </div>
  );
}
