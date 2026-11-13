import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  countIssueFormsByStatus,
  listIssueFormFilterOptions,
  listIssueForms,
} from "@/lib/db/issueForms";
import {
  parseIssueFormFilters,
  parseIssueFormPageSize,
} from "@/lib/issueForms/register";
import { IssueFormsList } from "@/components/issueForms/IssueFormsList";

export const metadata: Metadata = {
  title: "Issue forms",
  description:
    "Every equipment issue form across assets: search, filter, follow up and download.",
};

export default async function IssueFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Forms carry payroll numbers and personal emails, so the register is staff-only, like the
  // asset tab it collects.
  await requireRole(["admin", "asset_manager"]);
  const params = await searchParams;
  const filters = parseIssueFormFilters(params);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = parseIssueFormPageSize(
    typeof params.pageSize === "string" ? params.pageSize : null,
  );

  const [result, counts, options] = await Promise.all([
    listIssueForms(filters, pageSize, (page - 1) * pageSize),
    countIssueFormsByStatus(filters),
    listIssueFormFilterOptions(),
  ]);

  // A page past the end (a stale link) goes to the last page rather than showing "no forms".
  if (result.items.length === 0 && result.total > 0) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      (Array.isArray(value) ? value : [value]).forEach((v) =>
        query.append(key, v),
      );
    }
    const lastPage = Math.ceil(result.total / pageSize);
    if (lastPage > 1) query.set("page", String(lastPage));
    const qs = query.toString();
    redirect(qs ? `/issue-forms?${qs}` : "/issue-forms");
  }

  return (
    <IssueFormsList
      forms={result.items}
      total={result.total}
      page={page}
      pageSize={pageSize}
      sort={filters.sort}
      counts={counts}
      options={options}
    />
  );
}
