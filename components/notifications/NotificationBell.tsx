"use client";

import * as React from "react";
import { Bell, CheckCheck, Inbox, List } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { NotificationItem } from "./NotificationItem";
import {
  useNotificationMutations,
  useNotificationPage,
} from "@/lib/hooks/useNotifications";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import type { Notification } from "@/types/notification";

const BELL_LIMIT = 8;

/** Topbar bell (phase-7): unread count badge, the latest few notifications, click to mark read
 * (and open the asset when the user can see it), "Mark all as read", and "View all" into the
 * paginated /notifications page. */
export function NotificationBell() {
  const router = useRouteLoadingRouter();
  const { data } = useNotificationPage({
    limit: BELL_LIMIT,
    offset: 0,
    unreadOnly: false,
  });
  const { setRead, markAllRead } = useNotificationMutations();

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  function open(n: Notification) {
    if (!n.isRead) setRead.mutate({ id: n.id, isRead: true });
    if (n.relatedAssetId && n.assetViewable) {
      router.push(`/assets/${n.relatedAssetId}`);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        // Only the list scrolls; the header and the Mark all / View all actions stay pinned
        // instead of sliding below the menu's max height.
        className="flex max-h-[min(32rem,var(--radix-dropdown-menu-content-available-height))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden"
      >
        <DropdownMenuLabel className="flex shrink-0 items-center justify-between">
          <span className="font-medium">Notifications</span>
          {unread > 0 && (
            <span className="text-muted-foreground text-xs">
              {unread} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-2 py-6 text-sm">
            <Inbox className="h-6 w-6" />
            You&apos;re all caught up.
          </div>
        ) : (
          <div className="scroll-area-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => open(n)}
                className="items-start"
              >
                <NotificationItem notification={n} compact />
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={unread === 0 || markAllRead.isPending}
          onSelect={(e) => {
            // Keep the menu open so the list visibly flips to read.
            e.preventDefault();
            markAllRead.mutate();
          }}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/notifications")}>
          <List className="h-4 w-4" />
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
