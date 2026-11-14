"use client";

import * as React from "react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { cn } from "@/lib/utils";

/** Re-fetches the current page's data on demand. Visited pages stay in the client cache for a
 * while (`staleTimes` in next.config.ts), so other users' changes can take that long to show;
 * this skips the wait. It re-renders the page's server components (`router.refresh()`, which
 * also drops every other cached page) and refetches any TanStack queries on screen, such as
 * the notifications list, whose data `router.refresh()` alone doesn't touch. URL state like the
 * assets list's filters, sort and page is kept, since it's a refresh of the same URL.
 *
 * Icon-only below `sm` to save header space, with the label kept for screen readers. When it
 * finishes, a polite live region says so, since the data changing in place is otherwise silent. */
export function RefreshButton({ className }: { className?: string }) {
  const router = useRouteLoadingRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");

  function handleClick() {
    setRefreshing(true);
    setAnnouncement("");
    const queries = queryClient.invalidateQueries({ refetchType: "active" });
    router.refresh(() => {
      void queries.finally(() => {
        setRefreshing(false);
        setAnnouncement("Page refreshed");
      });
    });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={refreshing}
        aria-busy={refreshing || undefined}
        aria-label="Refresh"
        title="Refresh"
        className={className}
      >
        <ArrowsClockwiseIcon
          aria-hidden="true"
          className={cn(refreshing && "motion-safe:animate-spin")}
        />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
