import type { Metadata } from "next";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { AssetStatusesManager } from "./AssetStatusesManager";

export const metadata: Metadata = {
  title: "Asset statuses",
  description: "Manage the lifecycle statuses an asset moves through.",
};

export default async function AssetStatusesPage() {
  const statuses = await listAssetStatuses();
  return <AssetStatusesManager initialStatuses={statuses} />;
}
