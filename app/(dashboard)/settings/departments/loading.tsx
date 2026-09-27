import { SettingsTableSkeleton } from "@/components/skeletons/SettingsSkeletons";

export default function DepartmentsLoading() {
  return (
    <SettingsTableSkeleton
      columns={[
        { header: "Name" },
        { header: "Code" },
        { header: "Actions", cell: "actions", actions: 2 },
      ]}
    />
  );
}
