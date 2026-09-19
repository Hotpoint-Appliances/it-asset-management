import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Icon className="text-muted-foreground h-8 w-8" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
