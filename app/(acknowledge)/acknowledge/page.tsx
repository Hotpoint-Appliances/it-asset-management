import type { Metadata } from "next";
import {
  ChatCenteredTextIcon,
  CheckCircleIcon,
  LinkIcon,
} from "@phosphor-icons/react/ssr";
import { getIssueFormByToken } from "@/lib/db/issueForms";
import { AcknowledgeForm } from "@/components/acknowledge/AcknowledgeForm";
import { IssueFormSummary } from "@/components/acknowledge/IssueFormSummary";
import { signatureFont } from "@/components/acknowledge/signatureFont";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Equipment issue form",
  description: "Review and acknowledge the IT equipment issued to you.",
  // The token is in this page's URL; never send it on to another site in a Referer header.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

function Notice({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {icon}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="text-muted-foreground max-w-md text-sm">{children}</div>
    </div>
  );
}

export default async function AcknowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const form =
    typeof token === "string" ? await getIssueFormByToken(token) : null;

  if (!form || typeof token !== "string") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Notice
          icon={
            <span className="bg-destructive/10 text-destructive mb-2 flex h-12 w-12 items-center justify-center rounded-xl">
              <LinkIcon weight="bold" aria-hidden="true" className="h-6 w-6" />
            </span>
          }
          title="This link is no longer valid"
        >
          It may have expired, been replaced by a newer email, or the form may
          have been cancelled. Please contact the ICT Department.
        </Notice>
      </div>
    );
  }

  const pdfHref = `/api/acknowledge/pdf?token=${encodeURIComponent(token)}`;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      {form.status === "acknowledged" && (
        <Notice
          icon={
            <CheckCircleIcon
              weight="bold"
              aria-hidden="true"
              className="text-success mb-2 h-10 w-10"
            />
          }
          title="Thank you, your acknowledgement is recorded"
        >
          <p className={`${signatureFont.className} text-foreground text-3xl`}>
            {form.acknowledgedName}
          </p>
          <p>{formatDateTime(form.acknowledgedAt!)} EAT</p>
        </Notice>
      )}
      {form.status === "disputed" && (
        <Notice
          icon={
            <ChatCenteredTextIcon
              weight="bold"
              aria-hidden="true"
              className="text-warning mb-2 h-10 w-10"
            />
          }
          title="Your report has been sent"
        >
          The ICT Department will review it and send you a corrected form if one
          is needed. You don&apos;t need to do anything else for now.
        </Notice>
      )}
      {form.status === "pending" && (
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Please review your equipment issue form
          </h1>
          <p className="text-muted-foreground text-sm">
            Check the details below. If they&apos;re correct, sign at the bottom
            of the page.
          </p>
        </div>
      )}

      <IssueFormSummary form={form} />

      <div className="flex justify-end">
        <DownloadButton href={pdfHref} variant="outline" size="sm">
          Download PDF
        </DownloadButton>
      </div>

      {form.status === "pending" && (
        <AcknowledgeForm token={token} issuedToName={form.issuedToName} />
      )}
    </div>
  );
}
