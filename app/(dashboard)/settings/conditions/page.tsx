import type { Metadata } from "next";
import { listAssetConditions } from "@/lib/db/assetConditions";
import { AssetConditionsManager } from "./AssetConditionsManager";

export const metadata: Metadata = {
  title: "Asset conditions",
  description: "Manage the condition options an asset can be in.",
};

export default async function AssetConditionsPage() {
  const conditions = await listAssetConditions();
  return <AssetConditionsManager initialConditions={conditions} />;
}
