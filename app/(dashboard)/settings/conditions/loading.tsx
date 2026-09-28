import { SettingsTableSkeleton } from "@/components/skeletons/SettingsSkeletons";

export default function ConditionsLoading() {
  return (
    <SettingsTableSkeleton
      columns={[
        { header: "Name" },
        { header: "Sort order" },
        { header: "Actions", cell: "actions", actions: 2 },
      ]}
    />
  );
}
