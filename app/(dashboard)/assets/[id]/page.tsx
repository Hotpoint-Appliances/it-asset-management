import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAssetById } from "@/lib/db/assets";
import { listAssetAttachments } from "@/lib/db/assetAttachments";
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

  const attachments = await listAssetAttachments(id);

  return (
    <AssetDetail
      asset={asset}
      attachments={attachments}
      canManage={session.roleName === "admin" || session.roleName === "asset_manager"}
    />
  );
}
