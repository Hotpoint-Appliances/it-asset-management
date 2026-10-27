import { SettingsTableSkeleton } from "@/components/skeletons/SettingsSkeletons";

export default function AccessoriesLoading() {
  return (
    <SettingsTableSkeleton
      columns={[
        { header: "Name" },
        { header: "Description" },
        { header: "Status", cell: "badge" },
        { header: "In use" },
        { header: "Actions", cell: "actions", actions: 2 },
      ]}
    />
  );
}
