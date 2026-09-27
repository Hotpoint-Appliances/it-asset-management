import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { AssetFormSkeleton } from "@/components/skeletons/AssetFormSkeleton";

export default function NewAssetLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="New asset"
        description="Register a new asset in the inventory."
      />
      <AssetFormSkeleton />
    </div>
  );
}
