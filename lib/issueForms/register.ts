/** The issue-form register (/issue-forms): its filters, sort and page size, parsed from the URL.
 * Shared by the page and the Excel export so both read the same query string. Pure: the client
 * list imports it too. The SQL for each filter and sort key lives in lib/db/issueForms.ts. */

import type { IssueFormStatus } from "@/types/issueForm";
import { ASSET_PAGE_SIZES, DEFAULT_ASSET_PAGE_SIZE } from "@/lib/assetPageSize";

export const ISSUE_FORM_STATUSES: IssueFormStatus[] = [
  "pending",
  "disputed",
  "acknowledged",
  "expired",
  "voided",
  "superseded",
];

export const ISSUE_FORM_SORT_KEYS = [
  "number",
  "asset",
  "issuedTo",
  "department",
  "issueDate",
  "status",
] as const;

export type IssueFormSortKey = (typeof ISSUE_FORM_SORT_KEYS)[number];

export interface IssueFormSort {
  key: IssueFormSortKey;
  dir: "asc" | "desc";
}

/** The multi-value filters and their URL keys. */
export const ISSUE_FORM_MULTI_FILTERS = [
  "status",
  "department",
  "location",
  "approver",
  "issuedBy",
] as const;

export interface IssueFormFilters {
  statuses: IssueFormStatus[];
  departments: string[];
  locations: string[];
  /** HOD emails, lower-cased. */
  approvers: string[];
  /** User ids of the staff who triggered the forms. */
  issuedBy: string[];
  emailFailed: boolean;
  /** Issue date range, "YYYY-MM-DD", inclusive. */
  from: string | null;
  to: string | null;
  search: string | null;
  sort: IssueFormSort | null;
}

export const ISSUE_FORM_PAGE_SIZES = ASSET_PAGE_SIZES;
export const DEFAULT_ISSUE_FORM_PAGE_SIZE = DEFAULT_ASSET_PAGE_SIZE;

type Params = Record<string, string | string[] | undefined>;

function all(params: Params, key: string): string[] {
  const value = params[key];
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function one(params: Params, key: string): string | null {
  return all(params, key)[0] ?? null;
}

function dateOnly(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Unknown values are dropped rather than rejected, so a stale or hand-edited link still loads. */
export function parseIssueFormFilters(params: Params): IssueFormFilters {
  const sortKey = one(params, "sort");
  const sort =
    sortKey && (ISSUE_FORM_SORT_KEYS as readonly string[]).includes(sortKey)
      ? {
          key: sortKey as IssueFormSortKey,
          dir:
            one(params, "dir") === "desc"
              ? ("desc" as const)
              : ("asc" as const),
        }
      : null;
  return {
    statuses: all(params, "status").filter((s): s is IssueFormStatus =>
      (ISSUE_FORM_STATUSES as string[]).includes(s),
    ),
    departments: all(params, "department"),
    locations: all(params, "location"),
    approvers: all(params, "approver").map((e) => e.toLowerCase()),
    issuedBy: all(params, "issuedBy").filter((id) =>
      /^[0-9a-f-]{36}$/i.test(id),
    ),
    emailFailed: one(params, "emailFailed") === "1",
    from: dateOnly(one(params, "from")),
    to: dateOnly(one(params, "to")),
    search: one(params, "search")?.trim() || null,
    sort,
  };
}

export function parseIssueFormPageSize(value: string | null): number {
  const n = Number(value);
  return (ISSUE_FORM_PAGE_SIZES as readonly number[]).includes(n)
    ? n
    : DEFAULT_ISSUE_FORM_PAGE_SIZE;
}

/** URLSearchParams has no plain-object form with repeated keys, so this bridges it for routes. */
export function searchParamsToRecord(params: URLSearchParams): Params {
  const record: Record<string, string[]> = {};
  for (const [key, value] of params) (record[key] ??= []).push(value);
  return record;
}
