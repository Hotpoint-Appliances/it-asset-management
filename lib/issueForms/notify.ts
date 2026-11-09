import { after } from "next/server";
import {
  expireAllStaleForms,
  listIssueFormRemindersDue,
  markIssueFormReminded,
  recordIssueFormEmail,
} from "@/lib/db/issueForms";
import { insertNotifications, markEmailsSent } from "@/lib/db/notifications";
import { isEmailConfigured } from "@/lib/email/graphClient";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  appUrl,
  renderIssueFormConfirmationEmail,
  renderIssueFormDisputedEmail,
  renderIssueFormRequestEmail,
} from "@/lib/email/templates";
import { formatDateTime } from "@/lib/format";
import { renderIssueFormPdf } from "./pdf";
import { LINK_TTL_DAYS } from "./rules";
import type { IssueForm } from "@/types/issueForm";

const LOG = "[issue-forms]";

function equipmentLabel(form: IssueForm): string {
  return `${form.make} ${form.model} (${form.financeAssetNo})`;
}

async function sendRequestEmail(
  form: IssueForm,
  token: string,
  reminder: boolean,
): Promise<boolean> {
  const link = appUrl(`/acknowledge?token=${encodeURIComponent(token)}`);
  if (!link || !isEmailConfigured()) return false;
  try {
    const { subject, html } = renderIssueFormRequestEmail({
      recipientName: form.issuedToName,
      formNumber: form.formNumber,
      equipment: equipmentLabel(form),
      issuedBy: form.createdByName,
      link,
      validDays: LINK_TTL_DAYS,
      reminder,
    });
    await sendEmail({ to: form.recipientEmail, subject, html });
    return true;
  } catch (err) {
    console.error(`${LOG} email for ${form.formNumber} failed`, err);
    return false;
  }
}

/** Unlike other notifications this isn't best-effort silence: the admin is told if it failed, and
 * the form stays open so they can re-send it or hand over the PDF. */
export async function deliverIssueFormRequest(
  form: IssueForm,
  token: string,
): Promise<boolean> {
  const sent = await sendRequestEmail(form, token, false);
  await recordIssueFormEmail(form.id, sent);
  return sent;
}

/** The recipient, copying whoever triggered the form and the HOD named on it. In-app row first,
 * so a failed email still leaves the admin something, and the daily job retries it. */
async function notifyAcknowledged(form: IssueForm): Promise<void> {
  const ids = await insertNotifications([
    {
      userId: form.createdBy,
      type: "issue_form_acknowledged",
      title: `Issue form acknowledged: ${form.formNumber}`,
      message: `${form.issuedToName} acknowledged ${equipmentLabel(form)}.`,
      relatedAssetId: form.assetId,
    },
  ]);
  if (!isEmailConfigured()) return;
  const { subject, html } = renderIssueFormConfirmationEmail({
    recipientName: form.issuedToName,
    formNumber: form.formNumber,
    equipment: equipmentLabel(form),
    acknowledgedAt: `${formatDateTime(form.acknowledgedAt!)} EAT`,
  });
  const cc = [...new Set([form.createdByEmail, form.approvedByEmail])].filter(
    (address) => address.toLowerCase() !== form.recipientEmail.toLowerCase(),
  );
  await sendEmail({
    to: form.recipientEmail,
    cc,
    subject,
    html,
    attachments: [
      {
        name: `${form.formNumber}.pdf`,
        contentType: "application/pdf",
        content: await renderIssueFormPdf(form),
      },
    ],
  });
  await markEmailsSent(ids);
}

async function notifyDisputed(form: IssueForm): Promise<void> {
  const ids = await insertNotifications([
    {
      userId: form.createdBy,
      type: "issue_form_disputed",
      title: `Problem reported: ${form.formNumber}`,
      message: `${form.issuedToName}: ${form.disputeReason}`,
      relatedAssetId: form.assetId,
    },
  ]);
  if (!isEmailConfigured()) return;
  const { subject, html } = renderIssueFormDisputedEmail({
    recipientName: form.createdByName,
    formNumber: form.formNumber,
    equipment: equipmentLabel(form),
    issuedToName: form.issuedToName,
    reason: form.disputeReason ?? "",
    link: appUrl(`/assets/${form.assetId}`),
  });
  await sendEmail({ to: form.createdByEmail, subject, html });
  await markEmailsSent(ids);
}

function afterResponse(label: string, work: () => Promise<void>): void {
  after(async () => {
    try {
      await work();
    } catch (err) {
      console.error(`${LOG} ${label} failed`, err);
    }
  });
}

export function scheduleAcknowledgedNotifications(form: IssueForm): void {
  afterResponse(`confirmation for ${form.formNumber}`, () =>
    notifyAcknowledged(form),
  );
}

export function scheduleDisputedNotifications(form: IssueForm): void {
  afterResponse(`dispute notice for ${form.formNumber}`, () =>
    notifyDisputed(form),
  );
}

export interface IssueFormCheckSummary {
  expired: number;
  reminders: number;
}

/** The daily job's share: retire links past their 14 days, then chase what's still pending. */
export async function runIssueFormChecks(): Promise<IssueFormCheckSummary> {
  const expired = await expireAllStaleForms();
  await insertNotifications(
    expired.map((form) => ({
      userId: form.createdBy,
      type: "issue_form_expired" as const,
      title: `Issue form expired: ${form.formNumber}`,
      message: `${form.issuedToName} didn't respond to ${form.formNumber} for ${equipmentLabel(form)}. Trigger a new form if it's still needed.`,
      relatedAssetId: form.assetId,
      dedupeKey: `issue_form_expired:${form.id}`,
    })),
  );

  let reminders = 0;
  for (const { form, token } of await listIssueFormRemindersDue()) {
    if (await sendRequestEmail(form, token, true)) {
      await markIssueFormReminded(form.id);
      reminders++;
    }
  }
  return { expired: expired.length, reminders };
}
