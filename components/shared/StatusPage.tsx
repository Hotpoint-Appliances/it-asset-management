import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function StatusPage({
  icon: Icon,
  iconClassName,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Icon className={cn("text-muted-foreground h-8 w-8", iconClassName)} />
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {action && (
        <CardContent className="flex justify-center">{action}</CardContent>
      )}
    </Card>
  );
}
