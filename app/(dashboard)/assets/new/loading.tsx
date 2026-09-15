import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { FormSkeleton } from "@/components/skeletons/FormSkeleton";

export default function NewAssetLoading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton withAction={false} />
      <FormSkeleton sections={4} />
    </div>
  );
}
