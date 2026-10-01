import {
  ArrowRightLeft,
  Bell,
  ShieldAlert,
  UserCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/notification";

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  asset_assigned: UserCheck,
  asset_transferred: ArrowRightLeft,
  maintenance_due: Wrench,
  warranty_expiring: ShieldAlert,
};

/** Presentational body shared by the bell dropdown and the /notifications page; the caller
 * supplies the interactive wrapper (menu item or row button). Unread state is carried by a dot
 * *and* bold text plus a screen-reader label, never colour alone. */
export function NotificationItem({
  notification,
  compact = false,
}: {
  notification: Notification;
  compact?: boolean;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  return (
    <span className="flex w-full min-w-0 items-start gap-3 text-left">
      <span className="bg-muted text-muted-foreground mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "min-w-0 text-sm break-words",
              // Two lines, not one: the tail of a title ("... in 5 days: DEMO-014") is the useful part.
              compact && "line-clamp-2",
              notification.isRead ? "font-normal" : "font-semibold",
            )}
          >
            {!notification.isRead && <span className="sr-only">Unread: </span>}
            {notification.title}
          </span>
          <time
            dateTime={notification.createdAt}
            className="text-muted-foreground shrink-0 text-xs"
            suppressHydrationWarning
          >
            {formatRelativeTime(notification.createdAt)}
          </time>
        </span>
        {notification.message && (
          <span
            className={cn(
              "text-muted-foreground text-xs",
              compact && "line-clamp-2",
            )}
          >
            {notification.message}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mt-2 h-2 w-2 shrink-0 rounded-full",
          notification.isRead ? "bg-transparent" : "bg-primary",
        )}
      />
    </span>
  );
}
