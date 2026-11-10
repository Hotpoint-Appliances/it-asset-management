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
import { listIssueFormsForAsset } from "@/lib/db/issueForms";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { tab } = await searchParams;
  const asset = await getAssetForPage(id, session);
  if (!asset) notFound();

  const canManage =
    session.roleName === "admin" || session.roleName === "asset_manager";

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
    issueForms,
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
    canManage ? listIssueFormsForAsset(id) : Promise.resolve([]),
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
      issueForms={issueForms}
      initialTab={canManage && tab === "issue-forms" ? tab : "overview"}
      canManage={canManage}
      isAdmin={session.roleName === "admin"}
      locations={locations}
      departments={departments.items}
      vendors={vendors.items}
      conditions={conditions}
      statuses={statuses}
    />
  );
}
