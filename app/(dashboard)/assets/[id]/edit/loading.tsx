import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { AssetFormSkeleton } from "@/components/skeletons/AssetFormSkeleton";

export default function EditAssetLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton title="Edit asset" />
      <AssetFormSkeleton />
    </div>
  );
}
