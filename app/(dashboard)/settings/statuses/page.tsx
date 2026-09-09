import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { AssetStatusesManager } from "./AssetStatusesManager";

export default async function AssetStatusesPage() {
  const statuses = await listAssetStatuses();
  return <AssetStatusesManager initialStatuses={statuses} />;
}
