"use client";

import { Button } from "@/components/ui/Button";

/** Footer for a client-paged list (see `usePagination`): "Showing 11–20 of 45" with
 * Previous/Next, same shape as the assets register footer. Renders nothing when everything fits
 * on one page. `noun` names what's being counted, e.g. "entries". */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  setPage,
  noun,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
  noun?: string;
}) {
  if (total <= pageSize) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      <p
        className="text-muted-foreground text-sm whitespace-nowrap"
        aria-live="polite"
      >
        Showing {first === last ? first : `${first}–${last}`} of {total}
        {noun && ` ${noun}`}
      </p>
      <div className="ml-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
