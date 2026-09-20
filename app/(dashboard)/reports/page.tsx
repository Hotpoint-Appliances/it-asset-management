import { ClipboardList, Trash2, TrendingDown } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { ReportCard } from "@/components/reports/ReportCard";
import { AuditTrailReportCard } from "@/components/reports/AuditTrailReportCard";

/** Reports hub (phase-6). Who sees what mirrors the export routes' own role checks: everyone
 * gets the register and audit trail (viewers scoped to their department by the query), while the
 * finance-flavoured disposal register and depreciation summary are admin / asset_manager only.
 * The routes enforce this independently, hiding a card here is convenience, not security. */
export default async function ReportsPage() {
  const session = await requireSession();
  const canManage =
    session.roleName === "admin" || session.roleName === "asset_manager";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Excel exports for finance and audit.
          {session.roleName === "viewer" &&
            " Exports include your department only."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard
          icon={ClipboardList}
          title="Asset register"
          description="Every asset with its category, location, department, owner, condition, status, vendor and procurement details. To export a filtered subset, filter on the Assets page and use Export there."
          href="/api/reports/asset-register"
        />
        <AuditTrailReportCard />
        {canManage && (
          <ReportCard
            icon={Trash2}
            title="Disposal register"
            description="Every disposed asset with method, value, approver and disposal date, joined to its purchase details."
            href="/api/reports/disposal-register"
          />
        )}
        {canManage && (
          <ReportCard
            icon={TrendingDown}
            title="Depreciation summary"
            description="Current book value per asset using the straight-line method, floored at salvage value. Assets missing a purchase date, cost or useful life are listed with a note instead of a value."
            href="/api/reports/depreciation"
          />
        )}
      </div>
    </div>
  );
}
