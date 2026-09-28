import { SettingsTableSkeleton } from "@/components/skeletons/SettingsSkeletons";

export default function VendorsLoading() {
  return (
    <SettingsTableSkeleton
      columns={[
        { header: "Name" },
        { header: "Contact" },
        { header: "Email" },
        { header: "Phone" },
        { header: "Actions", cell: "actions", actions: 2 },
      ]}
    />
  );
}
