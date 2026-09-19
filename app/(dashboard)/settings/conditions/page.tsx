import { listAssetConditions } from "@/lib/db/assetConditions";
import { AssetConditionsManager } from "./AssetConditionsManager";

export default async function AssetConditionsPage() {
  const conditions = await listAssetConditions();
  return <AssetConditionsManager initialConditions={conditions} />;
}
