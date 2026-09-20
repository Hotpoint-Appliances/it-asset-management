import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

/** One exportable report. Downloads are plain `<a download>` links to the /api/reports route,
 * the server builds the workbook and answers with Content-Disposition: attachment, so there's
 * no client-side generation and no fetch/blob juggling. `children` is for report-specific
 * options (e.g. the audit trail's date range) rendered above the button. */
export function ReportCard({
  icon: Icon,
  title,
  description,
  href,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  children?: ReactNode;
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
        <Button asChild className="self-start">
          <a href={href} download>
            <Download className="h-4 w-4" />
            Download .xlsx
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
