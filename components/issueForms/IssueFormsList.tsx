"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Boxes,
  Eye,
  FileSignature,
  MoreHorizontal,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  stickyEndCellClass,
  stickyEndHeadClass,
} from "@/components/ui/Table";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MultiSelectFilter } from "@/components/shared/MultiSelectFilter";
import { SortableHead } from "@/components/shared/SortableHead";
import {
  IssueFormVoidDialog,
  issueFormStatusDetail,
  useResendIssueForm,
} from "@/components/assets/IssueFormActions";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { formatDate } from "@/lib/format";
import {
  ISSUE_FORM_STATUS_LABELS,
  ISSUE_FORM_STATUS_VARIANTS,
} from "@/lib/issueForms/rules";
import {
  DEFAULT_ISSUE_FORM_PAGE_SIZE,
  ISSUE_FORM_MULTI_FILTERS,
  ISSUE_FORM_PAGE_SIZES,
  ISSUE_FORM_STATUSES,
  type IssueFormSort,
  type IssueFormSortKey,
} from "@/lib/issueForms/register";
import { cn } from "@/lib/utils";
import type {
  IssueFormFilterOptions,
  IssueFormListItem,
  IssueFormStatusCounts,
} from "@/types/issueForm";

interface IssueFormsListProps {
  forms: IssueFormListItem[];
  total: number;
  page: number;
  pageSize: number;
  sort: IssueFormSort | null;
  counts: IssueFormStatusCounts;
  options: IssueFormFilterOptions;
}

const FILTER_KEYS = [...ISSUE_FORM_MULTI_FILTERS, "emailFailed", "from", "to"];

export function IssueFormsList({
  forms,
  total,
  page,
  pageSize,
  sort,
  counts,
  options,
}: IssueFormsListProps) {
  const router = useRouteLoadingRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = React.useState(urlSearch);
  // Back/forward changes the URL without remounting the page, so the box follows it.
  const [prevUrlSearch, setPrevUrlSearch] = React.useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearch(urlSearch);
  }
  const { resending, resend } = useResendIssueForm();
  const [voiding, setVoiding] = React.useState<IssueFormListItem | null>(null);

  const selectedStatuses = searchParams.getAll("status");
  const emailFailed = searchParams.get("emailFailed") === "1";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function pushParams(params: URLSearchParams) {
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    pushParams(params);
  }

  function setMulti(key: string, values: string[]) {
    update((params) => {
      params.delete(key);
      values.forEach((v) => params.append(key, v));
    });
  }

  function setSingle(key: string, value: string | null) {
    update((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function toggleStatus(status: string) {
    setMulti(
      "status",
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((s) => s !== status)
        : [...selectedStatuses, status],
    );
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSingle("search", search.trim() || null);
  }

  function clearFilters() {
    setSearch("");
    // Keeps the chosen sort and page size; only filters, search and page go.
    const params = new URLSearchParams();
    if (sort) {
      params.set("sort", sort.key);
      params.set("dir", sort.dir);
    }
    const size = searchParams.get("pageSize");
    if (size) params.set("pageSize", size);
    pushParams(params);
  }

  /** asc -> desc -> back to the default order (newest first). */
  function toggleSort(key: IssueFormSortKey) {
    update((params) => {
      if (sort?.key !== key) {
        params.set("sort", key);
        params.set("dir", "asc");
      } else if (sort.dir === "asc") {
        params.set("dir", "desc");
      } else {
        params.delete("sort");
        params.delete("dir");
      }
    });
  }

  function sortableHead(key: IssueFormSortKey, label: string) {
    return (
      <SortableHead
        label={label}
        direction={sort?.key === key ? sort.dir : null}
        onSort={() => toggleSort(key)}
      />
    );
  }

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  /** Keeps the current first row in view, like the assets list. */
  function changePageSize(nextSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSize === DEFAULT_ISSUE_FORM_PAGE_SIZE) params.delete("pageSize");
    else params.set("pageSize", String(nextSize));
    const nextPage = Math.floor(((page - 1) * pageSize) / nextSize) + 1;
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters =
    FILTER_KEYS.some((key) => searchParams.getAll(key).length > 0) ||
    !!searchParams.get("search");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allCount = ISSUE_FORM_STATUSES.reduce((n, s) => n + counts[s], 0);

  // The export reads the same params minus paging, so it downloads exactly what's filtered.
  const exportParams = new URLSearchParams(searchParams.toString());
  exportParams.delete("page");
  exportParams.delete("pageSize");
  const exportHref = `/api/reports/issue-forms${exportParams.size ? `?${exportParams.toString()}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Issue forms</h1>
          <p className="text-muted-foreground text-sm">
            {total} form{total === 1 ? "" : "s"}
            {hasFilters ? " match" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <DownloadButton
            href={exportHref}
            variant="outline"
            disabled={total === 0}
          >
            Export
          </DownloadButton>
        </div>
      </div>

      {/* Status counts double as the status filter: each toggles in or out. They count under
          every other filter, so they show what each status would add. */}
      <div
        role="group"
        aria-label="Filter by status"
        className="flex flex-wrap gap-2"
      >
        <StatusChip
          label="All"
          count={allCount}
          pressed={selectedStatuses.length === 0 && !emailFailed}
          onClick={() =>
            update((params) => {
              params.delete("status");
              params.delete("emailFailed");
            })
          }
        />
        {ISSUE_FORM_STATUSES.map((status) => (
          <StatusChip
            key={status}
            label={ISSUE_FORM_STATUS_LABELS[status]}
            count={counts[status]}
            variant={ISSUE_FORM_STATUS_VARIANTS[status]}
            pressed={selectedStatuses.includes(status)}
            onClick={() => toggleStatus(status)}
          />
        ))}
        <StatusChip
          label="Email failed"
          count={counts.emailFailed}
          variant="danger"
          pressed={emailFailed}
          onClick={() => setSingle("emailFailed", emailFailed ? null : "1")}
        />
      </div>

      <div className="flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by form no., asset tag, serial, recipient or email…"
              aria-label="Search issue forms"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="Department"
            options={options.departments.map((d) => ({ value: d, label: d }))}
            selected={searchParams.getAll("department")}
            onChange={(v) => setMulti("department", v)}
          />
          <MultiSelectFilter
            label="Location"
            options={options.locations.map((l) => ({ value: l, label: l }))}
            selected={searchParams.getAll("location")}
            onChange={(v) => setMulti("location", v)}
          />
          <MultiSelectFilter
            label="Approver"
            options={options.approvers.map((a) => ({
              value: a.email,
              label: a.name,
            }))}
            selected={searchParams.getAll("approver")}
            onChange={(v) => setMulti("approver", v)}
          />
          <MultiSelectFilter
            label="Issued by"
            options={options.issuers.map((u) => ({
              value: u.id,
              label: u.name,
            }))}
            selected={searchParams.getAll("issuedBy")}
            onChange={(v) => setMulti("issuedBy", v)}
          />
          <div className="flex items-center gap-2">
            <DatePicker
              aria-label="Issued from"
              placeholder="Issued from"
              value={from}
              max={to || undefined}
              onChange={(v) => setSingle("from", v || null)}
              className="h-9 w-40"
            />
            <span aria-hidden="true" className="text-muted-foreground text-sm">
              –
            </span>
            <DatePicker
              aria-label="Issued to"
              placeholder="Issued to"
              value={to}
              min={from || undefined}
              onChange={(v) => setSingle("to", v || null)}
              className="h-9 w-40"
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No issue forms found"
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "Forms appear here once one is triggered from an asset's Actions menu."
          }
          action={
            hasFilters ? undefined : (
              <Button asChild>
                <Link href="/assets">
                  <Boxes className="h-4 w-4" />
                  Go to assets
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <Table
            className={cn(
              "transition-opacity",
              router.isPending && "pointer-events-none opacity-60",
            )}
          >
            <TableHeader>
              <TableRow>
                {sortableHead("number", "Form no.")}
                {sortableHead("asset", "Asset")}
                {sortableHead("issuedTo", "Issued to")}
                {sortableHead("department", "Department")}
                {sortableHead("issueDate", "Issue date")}
                <TableHead>Approver</TableHead>
                {sortableHead("status", "Status")}
                <TableHead className={cn(stickyEndHeadClass, "text-center")}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => {
                const detail = issueFormStatusDetail(form);
                const href = `/assets/${form.assetId}/issue-forms/${form.id}?from=register`;
                return (
                  // The whole row opens the form through a stretched link on its number, so
                  // ctrl/middle-click and keyboard focus behave like a real link.
                  <TableRow key={form.id} className="group/row relative">
                    <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                      <Link
                        href={href}
                        className="focus-visible:after:ring-ring after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset"
                      >
                        {form.formNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-56 flex-col">
                        <span className="font-mono text-xs">
                          {form.financeAssetNo}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {form.assetName}
                        </span>
                        {form.assetDeleted && (
                          <Badge variant="neutral" className="mt-1 w-fit">
                            Asset deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{form.issuedToName}</span>
                        <span className="text-muted-foreground text-xs">
                          {form.recipientEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{form.department}</span>
                        <span className="text-muted-foreground text-xs">
                          {form.location}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(form.issueDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{form.approvedByName}</span>
                        <span className="text-muted-foreground text-xs">
                          Issued by {form.createdByName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-64 flex-col gap-1">
                        <Badge
                          variant={ISSUE_FORM_STATUS_VARIANTS[form.status]}
                          className="w-fit"
                        >
                          {ISSUE_FORM_STATUS_LABELS[form.status]}
                        </Badge>
                        {detail && (
                          <span className="text-muted-foreground text-xs break-words">
                            {detail}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(stickyEndCellClass, "text-center")}
                    >
                      {/* Above the row's stretched link, so these get the clicks. */}
                      <div className="relative z-10 flex items-center justify-center gap-1">
                        <DownloadButton
                          href={`/api/assets/${form.assetId}/issue-forms/${form.id}/pdf`}
                          variant="ghost"
                          size="icon"
                          aria-label={`Download ${form.formNumber} as PDF`}
                        />
                        <RowMenu
                          form={form}
                          href={href}
                          resending={resending === form.id}
                          onResend={() => resend(form)}
                          onVoid={() => setVoiding(form)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground text-sm whitespace-nowrap">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-sm whitespace-nowrap"
                >
                  Rows per page
                </span>
                <Select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => changePageSize(Number(e.target.value))}
                  side="top"
                  disabled={router.isPending}
                  className="h-9 w-20"
                >
                  {ISSUE_FORM_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <IssueFormVoidDialog form={voiding} onClose={() => setVoiding(null)} />
    </div>
  );
}

function StatusChip({
  label,
  count,
  pressed,
  variant,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  variant?: string;
  onClick: () => void;
}) {
  const dot: Record<string, string> = {
    warning: "bg-warning",
    success: "bg-success",
    danger: "bg-destructive",
    neutral: "bg-muted-foreground",
  };
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "border-border hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-9",
        pressed && "border-primary bg-primary/10 text-foreground font-medium",
      )}
    >
      {variant && dot[variant] && (
        <span
          aria-hidden="true"
          className={cn("h-2 w-2 rounded-full", dot[variant])}
        />
      )}
      {label}
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}

function RowMenu({
  form,
  href,
  resending,
  onResend,
  onVoid,
}: {
  form: IssueFormListItem;
  href: string;
  resending: boolean;
  onResend: () => void;
  onVoid: () => void;
}) {
  const open = form.status === "pending" || form.status === "disputed";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" loading={resending}>
          {!resending && <MoreHorizontal className="h-4 w-4" />}
          <span className="sr-only">More actions for {form.formNumber}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={href}>
            <Eye className="h-4 w-4" />
            View form
          </Link>
        </DropdownMenuItem>
        {!form.assetDeleted && (
          <DropdownMenuItem asChild>
            <Link href={`/assets/${form.assetId}?tab=issue-forms`}>
              <Boxes className="h-4 w-4" />
              Open asset
            </Link>
          </DropdownMenuItem>
        )}
        {form.status === "pending" && (
          <DropdownMenuItem onSelect={onResend} disabled={resending}>
            <Send className="h-4 w-4" />
            Re-send email
          </DropdownMenuItem>
        )}
        {open && (
          <DropdownMenuItem
            onSelect={onVoid}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="h-4 w-4" />
            Void form
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
