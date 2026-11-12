import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";
import { TableSkeleton } from "./TableSkeleton";

// Status chips (All, six statuses, Email failed), then the filter pills and the two dates.
const CHIP_WIDTHS = [
  "w-16",
  "w-24",
  "w-24",
  "w-32",
  "w-24",
  "w-24",
  "w-28",
  "w-32",
];
const FILTER_WIDTHS = ["w-32", "w-28", "w-28", "w-28", "w-40", "w-40"];

/** Mirrors components/issueForms/IssueFormsList.tsx. */
export function IssueFormsListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton title="Issue forms" />
      <div className="flex flex-wrap gap-2">
        {CHIP_WIDTHS.map((width, i) => (
          <Skeleton key={i} className={cn("h-9 rounded-full", width)} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_WIDTHS.map((width, i) => (
            <Skeleton key={i} className={cn("h-9", width)} />
          ))}
        </div>
      </div>
      <TableSkeleton
        rows={10}
        columns={[
          { header: "Form no.", cell: "mono" },
          { header: "Asset", cell: "mono" },
          { header: "Issued to" },
          { header: "Department" },
          { header: "Issue date" },
          { header: "Approver" },
          { header: "Status", cell: "badge" },
          { header: "Actions", cell: "actions", actions: 2, sticky: true },
        ]}
      />
    </div>
  );
}
