"use client";

import * as React from "react";
import Link from "next/link";
import {
  EyeIcon,
  PaperPlaneTiltIcon,
  SignatureIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { DownloadButton } from "@/components/shared/DownloadButton";
import {
  IssueFormVoidDialog,
  issueFormStatusDetail,
  useResendIssueForm,
} from "@/components/assets/IssueFormActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { usePagination } from "@/lib/hooks/usePagination";
import { formatDate } from "@/lib/format";
import {
  ISSUE_FORM_STATUS_LABELS,
  ISSUE_FORM_STATUS_VARIANTS,
} from "@/lib/issueForms/rules";
import type { IssueForm } from "@/types/issueForm";

const PAGE_SIZE = 10;

export function IssueFormsTab({
  assetId,
  forms,
}: {
  assetId: string;
  forms: IssueForm[];
}) {
  const pagination = usePagination(forms, PAGE_SIZE);
  const { resending, resend } = useResendIssueForm();
  const [voiding, setVoiding] = React.useState<IssueForm | null>(null);

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={SignatureIcon}
        title="No issue forms yet"
        description="Forms issued for this asset will appear here. Start one from the Actions menu."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>Issued to</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.map((form) => {
            const detail = issueFormStatusDetail(form);
            const open =
              form.status === "pending" || form.status === "disputed";
            return (
              <TableRow key={form.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {form.formNumber}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{form.issuedToName}</span>
                    <span className="text-muted-foreground text-xs">
                      {form.recipientEmail}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(form.issueDate)}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-64 flex-col gap-1">
                    <Badge variant={ISSUE_FORM_STATUS_VARIANTS[form.status]}>
                      {ISSUE_FORM_STATUS_LABELS[form.status]}
                    </Badge>
                    {detail && (
                      <span className="text-muted-foreground text-xs break-words">
                        {detail}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/assets/${assetId}/issue-forms/${form.id}`}
                        aria-label={`View ${form.formNumber}`}
                      >
                        <EyeIcon
                          weight="bold"
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                        View
                      </Link>
                    </Button>
                    <DownloadButton
                      href={`/api/assets/${assetId}/issue-forms/${form.id}/pdf`}
                      variant="outline"
                      size="sm"
                      aria-label={`Download ${form.formNumber}`}
                    >
                      Download
                    </DownloadButton>
                    {form.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={resending === form.id}
                        onClick={() => resend(form)}
                      >
                        {resending !== form.id && (
                          <PaperPlaneTiltIcon
                            weight="bold"
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        )}
                        Re-send
                      </Button>
                    )}
                    {open && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVoiding(form)}
                      >
                        <XCircleIcon
                          weight="bold"
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                        Void
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Pagination {...pagination} noun="forms" />
      <IssueFormVoidDialog form={voiding} onClose={() => setVoiding(null)} />
    </div>
  );
}
