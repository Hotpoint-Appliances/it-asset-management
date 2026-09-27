import { Skeleton } from "@/components/ui/Skeleton";

export default function AssetLabelLoading() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="border-border flex w-72 flex-col items-center gap-3 rounded-md border p-6">
        <Skeleton className="h-[200px] w-[200px] rounded-md" />
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <p className="text-muted-foreground text-sm">
        Use your browser&apos;s print dialog (Ctrl/Cmd+P) to print this label.
      </p>
    </div>
  );
}
