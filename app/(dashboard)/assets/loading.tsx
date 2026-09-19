import { PageHeaderSkeleton } from "@/components/skeletons/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function AssetsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} columns={9} withFilters />
    </div>
  );
}
