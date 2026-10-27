"use client";

import * as React from "react";

/** Client-side paging for lists that are already fully loaded (an asset's audit log or
 * maintenance records, the settings tables). The page is clamped on every render, so deleting
 * the last row of the last page, or narrowing a search, lands on the new last page instead of
 * an empty one. Pair with `components/shared/Pagination.tsx`. */
export function usePagination<T>(items: T[], pageSize: number) {
  const [requestedPage, setPage] = React.useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;

  return {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
  };
}
