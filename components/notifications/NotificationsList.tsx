"use client";

import * as React from "react";
import Link from "next/link";
import { BellOff, CheckCheck, Mail, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotificationItem } from "./NotificationItem";
import {
  useNotificationMutations,
  useNotificationPage,
} from "@/lib/hooks/useNotifications";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { cn } from "@/lib/utils";
import type { Notification, NotificationPage } from "@/types/notification";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
] as const;

export function NotificationsList({
  page,
  pageSize,
  unreadOnly,
  initialData,
}: {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
  initialData: NotificationPage;
}) {
  const router = useRouteLoadingRouter();
  const { data = initialData } = useNotificationPage(
    { limit: pageSize, offset: (page - 1) * pageSize, unreadOnly },
    initialData,
  );
  const { setRead, markAllRead } = useNotificationMutations();

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const hrefFor = (nextPage: number, unread = unreadOnly) => {
    const params = new URLSearchParams();
    if (unread) params.set("filter", "unread");
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/notifications?${qs}` : "/notifications";
  };

  function openAsset(n: Notification) {
    if (!n.isRead) setRead.mutate({ id: n.id, isRead: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter notifications"
          className="bg-muted inline-flex rounded-lg p-1"
        >
          {FILTERS.map((f) => {
            const active = (f.key === "unread") === unreadOnly;
            return (
              <Link
                key={f.key}
                href={hrefFor(1, f.key === "unread")}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                {f.key === "unread" && data.unreadCount > 0 && (
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    {data.unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={data.unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck />
          Mark all as read
        </Button>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={
            unreadOnly ? "No unread notifications" : "No notifications yet"
          }
          description={
            unreadOnly
              ? "You're all caught up."
              : "Asset assignments, transfers, warranty and maintenance alerts will appear here."
          }
        />
      ) : (
        <Card className="divide-border divide-y p-0">
          {data.items.map((n) => (
            <div key={n.id} className="flex items-start gap-2 p-3 sm:p-4">
              {n.relatedAssetId && n.assetViewable ? (
                <Link
                  href={`/assets/${n.relatedAssetId}`}
                  onClick={() => openAsset(n)}
                  className="hover:bg-muted/50 focus-visible:ring-ring -m-2 min-w-0 flex-1 rounded-md p-2 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <NotificationItem notification={n} />
                </Link>
              ) : (
                <div className="min-w-0 flex-1">
                  <NotificationItem notification={n} />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={n.isRead ? "Mark as unread" : "Mark as read"}
                title={n.isRead ? "Mark as unread" : "Mark as read"}
                onClick={() => setRead.mutate({ id: n.id, isRead: !n.isRead })}
              >
                {n.isRead ? <Mail /> : <MailOpen />}
              </Button>
            </div>
          ))}
        </Card>
      )}

      {data.total > pageSize && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(hrefFor(page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(hrefFor(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
