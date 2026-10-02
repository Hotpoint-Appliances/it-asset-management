"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPage } from "@/types/notification";

/** Every notification query key starts with this, so a mutation from the bell refreshes the
 * /notifications page and vice versa. */
export const NOTIFICATIONS_KEY = ["notifications"] as const;

/** New notifications arrive from other users' actions and the daily scheduled check, not from
 * anything this tab does, so poll: once a minute, and whenever the window regains focus. */
const POLL_MS = 60_000;

export function useNotificationPage(
  params: { limit: number; offset: number; unreadOnly: boolean },
  initialData?: NotificationPage,
) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, params],
    queryFn: async () =>
      (
        await axios.get<NotificationPage>("/api/notifications", {
          params: {
            limit: params.limit,
            offset: params.offset,
            unread: params.unreadOnly ? 1 : undefined,
          },
        })
      ).data,
    initialData,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

  const setRead = useMutation({
    mutationFn: ({ id, isRead }: { id: number; isRead: boolean }) =>
      axios.patch(`/api/notifications/${id}`, { isRead }),
    onSettled: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => axios.post("/api/notifications/read-all"),
    onSettled: invalidate,
  });
  return { setRead, markAllRead };
}
