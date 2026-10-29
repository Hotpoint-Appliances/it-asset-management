import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession, requireSession } from "@/lib/auth/session";
import { getAssetForPage } from "@/lib/db/assets";
import { listAssetAttachments } from "@/lib/db/assetAttachments";
import { getDisposalByAssetId } from "@/lib/db/disposals";
import { listAuditLogForAsset } from "@/lib/db/auditLog";
import { listMaintenanceForAsset } from "@/lib/db/maintenance";
import { listLocations } from "@/lib/db/locations";
import { listDepartments } from "@/lib/db/departments";
import { listVendors } from "@/lib/db/vendors";
import { listAssetConditions } from "@/lib/db/assetConditions";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { listAccessories } from "@/lib/db/accessories";
import { listAssetAccessories } from "@/lib/db/assetAccessories";
import { AssetDetail } from "@/components/assets/AssetDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await getSession();
  if (!session) return {};
  const asset = await getAssetForPage((await params).id, session);
  if (!asset) return { title: "Asset not found" };
  return {
    title: asset.assetTag,
    description: `${asset.name}: details, attachments, maintenance, accessories and audit history.`,
  };
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const asset = await getAssetForPage(id, session);
  if (!asset) notFound();

  const [
    attachments,
    auditLog,
    maintenance,
    disposal,
    locations,
    departments,
    vendors,
    conditions,
    statuses,
    accessories,
    accessoryCatalog,
  ] = await Promise.all([
    listAssetAttachments(id),
    listAuditLogForAsset(id),
    listMaintenanceForAsset(id),
    asset.statusName === "disposed"
      ? getDisposalByAssetId(id)
      : Promise.resolve(null),
    listLocations(),
    listDepartments(500, 0),
    listVendors(500, 0),
    listAssetConditions(),
    listAssetStatuses(),
    listAssetAccessories(id),
    listAccessories({ activeOnly: true }),
  ]);

  return (
    <AssetDetail
      asset={asset}
      attachments={attachments}
      accessories={accessories}
      accessoryCatalog={accessoryCatalog}
      auditLog={auditLog}
      maintenance={maintenance}
      disposal={disposal}
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
