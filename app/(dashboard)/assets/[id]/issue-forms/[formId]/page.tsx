import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAssetForPage } from "@/lib/db/assets";
import { getIssueForm } from "@/lib/db/issueForms";
import { IssueFormSummary } from "@/components/acknowledge/IssueFormSummary";
import { IssueFormStatusPanel } from "@/components/assets/IssueFormStatusPanel";
import { DownloadButton } from "@/components/shared/DownloadButton";

export const metadata: Metadata = {
  title: "Equipment issue form",
  description: "Review an equipment issue form and where it stands.",
};

export default async function IssueFormPage({
  params,
}: {
  params: Promise<{ id: string; formId: string }>;
}) {
  const session = await requireRole(["admin", "asset_manager"]);
  const { id, formId } = await params;
  const asset = await getAssetForPage(id, session);
  const form = asset ? await getIssueForm(id, formId) : null;
  if (!asset || !form) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href={`/assets/${id}?tab=issue-forms`}
        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 w-fit items-center gap-1.5 text-sm sm:min-h-0"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to issue forms
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Equipment issue form
          </h1>
          <p className="text-muted-foreground text-sm break-words">
            {asset.assetTag} - {asset.name}
          </p>
        </div>
        <DownloadButton
          href={`/api/assets/${id}/issue-forms/${form.id}/pdf`}
          variant="outline"
          className="w-full shrink-0 sm:w-auto"
        >
          Download PDF
        </DownloadButton>
      </div>
      <IssueFormStatusPanel form={form} />
      <IssueFormSummary form={form} />
    </div>
  );
}
