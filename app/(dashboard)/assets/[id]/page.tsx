import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAssetById } from "@/lib/db/assets";
import { listAssetAttachments } from "@/lib/db/assetAttachments";
import { listAuditLogForAsset } from "@/lib/db/auditLog";
import { listMaintenanceForAsset } from "@/lib/db/maintenance";
import { listLocations } from "@/lib/db/locations";
import { listDepartments } from "@/lib/db/departments";
import { listVendors } from "@/lib/db/vendors";
import { listAssetConditions } from "@/lib/db/assetConditions";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { AssetDetail } from "@/components/assets/AssetDetail";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) notFound();

  const [
    attachments,
    auditLog,
    maintenance,
    locations,
    departments,
    vendors,
    conditions,
    statuses,
  ] = await Promise.all([
    listAssetAttachments(id),
    listAuditLogForAsset(id),
    listMaintenanceForAsset(id),
    listLocations(),
    listDepartments(500, 0),
    listVendors(500, 0),
    listAssetConditions(),
    listAssetStatuses(),
  ]);

  return (
    <AssetDetail
      asset={asset}
      attachments={attachments}
      auditLog={auditLog}
      maintenance={maintenance}
      canManage={
        session.roleName === "admin" || session.roleName === "asset_manager"
      }
      isAdmin={session.roleName === "admin"}
      locations={locations}
      departments={departments.items}
      vendors={vendors.items}
      conditions={conditions}
      statuses={statuses}
    />
  );
}
