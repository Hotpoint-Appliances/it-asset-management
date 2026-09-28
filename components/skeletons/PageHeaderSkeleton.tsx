import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/** Page title block. The title is static so it renders as real text; `description` does too when
 * it is static, otherwise a bar stands in for the data-driven subtitle (asset count, role). */
export function PageHeaderSkeleton({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const heading = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : (
        <Skeleton className="my-0.5 h-4 w-48" />
      )}
    </div>
  );
  if (!actions) return heading;
  return (
    <div className="flex items-center justify-between gap-2">
      {heading}
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
