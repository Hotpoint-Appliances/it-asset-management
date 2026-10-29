import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

/** One exportable report. The /api/reports route builds the workbook and answers with
 * Content-Disposition: attachment; DownloadButton fetches it so the button can show progress.
 * `children` is for report-specific options (e.g. the audit trail's date range) rendered
 * above the button. `disabled` blocks the download while those options are invalid. */
export function ReportCard({
  icon: Icon,
  title,
  description,
  href,
  children,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4 pt-0">
        {children}
        <DownloadButton href={href} disabled={disabled} className="self-start">
          Download .xlsx
        </DownloadButton>
      </CardContent>
    </Card>
  );
}
