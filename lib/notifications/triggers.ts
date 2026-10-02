import { after } from "next/server";
import {
  getAssetById,
  type AssetChange,
  type AssetRequester,
} from "@/lib/db/assets";
import { listWarrantyExpiring } from "@/lib/db/dashboard";
import { listMaintenanceDue } from "@/lib/db/maintenance";
import { getWarrantyWindows } from "@/lib/db/systemSettings";
import { getUserById } from "@/lib/db/users";
import {
  getActiveRecipient,
  insertNotifications,
  listAlertRecipients,
  listPendingEmails,
  markEmailsSent,
  type NotificationDraft,
  type PendingEmail,
  type Recipient,
} from "@/lib/db/notifications";
import { isEmailConfigured } from "@/lib/email/graphClient";
import { sendEmail } from "@/lib/email/sendEmail";
import { appUrl, renderNotificationEmail } from "@/lib/email/templates";
import type { NotificationType } from "@/types/notification";

// Notification triggers (phase-7). Two entry points:
//  - scheduleAssetChangeNotifications(): asset_assigned / asset_transferred, called by the asset
//    create / edit / transfer routes *after* their transaction commits. The work runs in
//    Next's after(), once the response is sent, so a slow or failing Graph call can never delay
//    or roll back the asset change itself.
//  - runScheduledChecks(): warranty_expiring / maintenance_due plus the email catch-up, called by
//    POST /api/cron/notifications-check (triggered daily by scripts/run-notifications-check.ps1).
// Email is always best-effort: failures are logged, the row keeps email_sent = false, and the
// next scheduled run retries it (within EMAIL_RETRY_DAYS).

const LOG = "[notifications]";

/** Triggers resolve asset details as an unscoped reader; who may *open* the asset is decided
 * per recipient when notifications are listed (see lib/db/notifications.ts ASSET_VIEWABLE). */
const SYSTEM_REQUESTER: AssetRequester = {
  roleName: "admin",
  departmentId: null,
};

/** Scheduled alerts are created by the cron run itself, so its email pass can send them at once. */
const SCHEDULED_TYPES: NotificationType[] = [
  "warranty_expiring",
  "maintenance_due",
];
/** How far back the scheduled run retries unsent emails; older ones are left in-app only. */
const EMAIL_RETRY_DAYS = 3;
/** Event rows younger than this are left to their own after() send, avoiding a double email. */
const EMAIL_SETTLE_MINUTES = 10;
/** Upper bound on assets examined per warranty run; far above any realistic fleet's 90-day set. */
const WARRANTY_SCAN_LIMIT = 10_000;

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

// ---------------------------------------------------------------------------------------------
// Email delivery
// ---------------------------------------------------------------------------------------------

export interface EmailSummary {
  configured: boolean;
  recipients: number;
  sent: number;
  failed: number;
}

/** Groups pending rows by recipient into one email each (a digest when there are several), and
 * marks rows sent only after Graph accepts that recipient's mail. Never throws. */
async function deliverPendingEmails(
  pending: PendingEmail[],
): Promise<EmailSummary> {
  const summary: EmailSummary = {
    configured: isEmailConfigured(),
    recipients: 0,
    sent: 0,
    failed: 0,
  };
  if (!summary.configured || !pending.length) return summary;

  const byRecipient = new Map<string, PendingEmail[]>();
  for (const row of pending) {
    const group = byRecipient.get(row.userEmail) ?? [];
    group.push(row);
    byRecipient.set(row.userEmail, group);
  }

  for (const [to, rows] of byRecipient) {
    summary.recipients++;
    const { subject, html } = renderNotificationEmail(
      rows[0].userName,
      rows.map((r) => ({
        title: r.title,
        message: r.message,
        link:
          r.relatedAssetId && r.assetViewable
            ? appUrl(`/assets/${r.relatedAssetId}`)
            : null,
      })),
    );
    try {
      await sendEmail({ to, subject, html });
      await markEmailsSent(rows.map((r) => r.id));
      summary.sent++;
    } catch (err) {
      summary.failed++;
      console.error(
        `${LOG} email to ${to} failed (${rows.length} notification(s))`,
        err,
      );
    }
  }
  return summary;
}

/** Email for an owner with no system login (free-text owner_email): there is no user to attach
 * an in-app row to (notifications.user_id is NOT NULL), so this is a one-shot, untracked send. */
async function sendOwnerEmail(
  to: string,
  ownerName: string | null,
  title: string,
  message: string,
): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const { subject, html } = renderNotificationEmail(ownerName, [
      { title, message, link: null },
    ]);
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error(`${LOG} email to free-text owner ${to} failed`, err);
  }
}

// ---------------------------------------------------------------------------------------------
// Event triggers: asset_assigned / asset_transferred
// ---------------------------------------------------------------------------------------------

/** Decides and delivers the notifications for one committed asset write. `before` is null for a
 * newly created asset. Rules (confirmed with the stakeholder, see phase-7-notifications):
 *  - asset_assigned: the owner changed. A system user gets an in-app row + email; a free-text
 *    owner with an email address gets the email only.
 *  - asset_transferred: location or department changed and the owner didn't: the current owner
 *    is told where the asset now is. (When both change, the assignment message already carries
 *    the new location, so the owner gets one notification, not two.)
 *  - The person who made the change is never notified about it. */
export async function notifyAssetChange(
  change: { before: AssetChange["before"] | null; after: AssetChange["after"] },
  actorId: string,
): Promise<void> {
  const { before, after: asset } = change;

  const userAssigned =
    !!asset.assignedUserId && asset.assignedUserId !== before?.assignedUserId;
  const freeTextAssigned =
    !asset.assignedUserId &&
    !!asset.ownerEmail &&
    (!!before?.assignedUserId ||
      before?.ownerEmail?.toLowerCase() !== asset.ownerEmail.toLowerCase());
  const moved =
    !!before &&
    (before.locationId !== asset.locationId ||
      before.departmentId !== asset.departmentId);

  const ownerNotified =
    (asset.assignedUserId && asset.assignedUserId !== actorId) ||
    (!asset.assignedUserId && asset.ownerEmail);
  if (!ownerNotified || !(userAssigned || freeTextAssigned || moved)) return;

  const [detail, actor] = await Promise.all([
    getAssetById(asset.id, SYSTEM_REQUESTER),
    getUserById(actorId),
  ]);
  if (!detail) return;

  const label = `${detail.name} (${detail.assetTag})`;
  const where = `Location: ${detail.locationName} · Department: ${detail.departmentName}.`;
  const by = actor ? ` by ${actor.fullName}` : "";
  const assigned = userAssigned || freeTextAssigned;
  const type: NotificationType = assigned
    ? "asset_assigned"
    : "asset_transferred";
  const title = assigned
    ? `Asset assigned to you: ${detail.assetTag}`
    : `Your asset was moved: ${detail.assetTag}`;
  const message = assigned
    ? `${label} was assigned to you${by}. ${where}`
    : `${label}, assigned to you, was moved${by}. ${where}`;

  if (asset.assignedUserId) {
    const recipient = await getActiveRecipient(asset.assignedUserId);
    if (!recipient) return;
    const ids = await insertNotifications([
      { userId: recipient.id, type, title, message, relatedAssetId: asset.id },
    ]);
    await deliverPendingEmails(await listPendingEmails({ ids }));
  } else if (asset.ownerEmail) {
    await sendOwnerEmail(asset.ownerEmail, asset.ownerName, title, message);
  }
}

/** Route-handler entry point: queue notifyAssetChange() to run after the response is sent. Call
 * it only once the asset write has committed. Errors are logged, never surfaced to the user. */
export function scheduleAssetChangeNotifications(
  change: { before: AssetChange["before"] | null; after: AssetChange["after"] },
  actorId: string,
): void {
  after(async () => {
    try {
      await notifyAssetChange(change, actorId);
    } catch (err) {
      console.error(
        `${LOG} asset change notification failed for ${change.after.id}`,
        err,
      );
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Scheduled triggers: warranty_expiring / maintenance_due
// ---------------------------------------------------------------------------------------------

export interface CheckSummary {
  matched: number;
  created: number;
}

/** One alert per asset per configured window (e.g. 90/60/30 days): an asset is placed in the
 * narrowest window its remaining days fall into, so the first run doesn't fire all three at once
 * for something already 10 days out. The dedupe key includes the expiry date, so extending a
 * warranty re-arms the alerts. Reuses phase-6's listWarrantyExpiring query. */
export async function runWarrantyExpiringCheck(
  recipients: Recipient[],
): Promise<CheckSummary> {
  const windows = await getWarrantyWindows();
  const items = await listWarrantyExpiring(
    windows[windows.length - 1],
    SYSTEM_REQUESTER,
    WARRANTY_SCAN_LIMIT,
  );

  const drafts: NotificationDraft[] = [];
  for (const item of items) {
    const window = windows.find((w) => item.daysRemaining <= w);
    if (window === undefined) continue;
    const title =
      item.daysRemaining === 0
        ? `Warranty expires today: ${item.assetTag}`
        : `Warranty expiring in ${item.daysRemaining} day${item.daysRemaining === 1 ? "" : "s"}: ${item.assetTag}`;
    const message = `${item.name} (${item.assetTag}), ${item.departmentName}: warranty ends on ${formatDate(item.warrantyExpiry)}.`;
    for (const r of recipients) {
      drafts.push({
        userId: r.id,
        type: "warranty_expiring",
        title,
        message,
        relatedAssetId: item.id,
        dedupeKey: `warranty_expiring:${item.id}:${item.warrantyExpiry}:${window}`,
      });
    }
  }
  const created = await insertNotifications(drafts);
  return { matched: items.length, created: created.length };
}

/** Scheduled maintenance whose date has arrived and hasn't been started: alerts admins, asset
 * managers and whoever scheduled it, once per maintenance record. */
export async function runMaintenanceDueCheck(
  recipients: Recipient[],
): Promise<CheckSummary> {
  const items = await listMaintenanceDue();

  const drafts: NotificationDraft[] = [];
  const creators = new Map<string, Recipient | null>();
  for (const item of items) {
    const itemRecipients = [...recipients];
    if (!recipients.some((r) => r.id === item.createdBy)) {
      if (!creators.has(item.createdBy)) {
        creators.set(item.createdBy, await getActiveRecipient(item.createdBy));
      }
      const creator = creators.get(item.createdBy);
      if (creator) itemRecipients.push(creator);
    }

    const overdue = item.daysOverdue > 0;
    const title = `${overdue ? "Maintenance overdue" : "Maintenance due today"}: ${item.assetTag}`;
    const vendor = item.vendorName ? ` with ${item.vendorName}` : "";
    const message = `${formatLabel(item.maintenanceType)} for ${item.assetName} (${item.assetTag})${vendor} was scheduled for ${formatDate(item.scheduledDate)} and hasn't been started.`;
    for (const r of itemRecipients) {
      drafts.push({
        userId: r.id,
        type: "maintenance_due",
        title,
        message,
        relatedAssetId: item.assetId,
        dedupeKey: `maintenance_due:${item.id}`,
      });
    }
  }
  const created = await insertNotifications(drafts);
  return { matched: items.length, created: created.length };
}

export interface ScheduledRunSummary {
  warrantyExpiring: CheckSummary;
  maintenanceDue: CheckSummary;
  email: EmailSummary;
}

/** The whole daily job. Idempotent: re-running creates nothing new (dedupe keys) and only emails
 * rows still unsent. The email pass covers this run's new alerts plus any earlier notification
 * (event-driven ones included) whose email failed within the last EMAIL_RETRY_DAYS. */
export async function runScheduledChecks(): Promise<ScheduledRunSummary> {
  const recipients = await listAlertRecipients();
  const warrantyExpiring = await runWarrantyExpiringCheck(recipients);
  const maintenanceDue = await runMaintenanceDueCheck(recipients);
  const email = await deliverPendingEmails(
    await listPendingEmails({
      withinDays: EMAIL_RETRY_DAYS,
      settleMinutes: EMAIL_SETTLE_MINUTES,
      immediateTypes: SCHEDULED_TYPES,
    }),
  );
  return { warrantyExpiring, maintenanceDue, email };
}
