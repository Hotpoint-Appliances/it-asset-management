import { SettingsTableSkeleton } from "@/components/skeletons/SettingsSkeletons";

export default function UsersLoading() {
  return (
    <SettingsTableSkeleton
      columns={[
        { header: "Name" },
        { header: "Email" },
        { header: "Role" },
        { header: "Department" },
        { header: "Status", cell: "badge" },
        { header: "Actions", cell: "actions", actions: 2 },
      ]}
    />
  );
}
