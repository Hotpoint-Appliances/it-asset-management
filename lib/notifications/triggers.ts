import { after } from "next/server";
import type { AssetRequester } from "@/lib/db/assets";
import {
  listAssetAccessories,
  type AccessoryChange,
} from "@/lib/db/assetAccessories";
import { listWarrantyExpiring } from "@/lib/db/dashboard";
import { listMaintenanceDue } from "@/lib/db/maintenance";
import { getWarrantyWindows } from "@/lib/db/systemSettings";
import {
  getActiveRecipient,
  insertNotifications,
  listAlertRecipients,
  listPendingEmails,
  markEmailsSent,
  resolveLookupNames,
  type LookupIds,
  type LookupKind,
  type NotificationDraft,
  type PendingEmail,
  type Recipient,
} from "@/lib/db/notifications";
import { isEmailConfigured } from "@/lib/email/graphClient";
import { sendEmail } from "@/lib/email/sendEmail";
import { appUrl, renderNotificationEmail } from "@/lib/email/templates";
import {
  runIssueFormChecks,
  type IssueFormCheckSummary,
} from "@/lib/issueForms/notify";
import type { NotificationType } from "@/types/notification";
import type { Asset } from "@/types/asset";
import { formatDate } from "@/lib/format";
import { formatAccessory } from "@/lib/assetAccessories";

// Notification triggers (phase-7). Two entry points:
//  - scheduleAssetEventNotifications(): every user-involved asset action (assign/unassign,
//    edit, transfer, status/condition, accessories, maintenance, disposal, deletion), called by
//    the asset routes *after* their transaction commits. The work runs in
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
  "issue_form_expired",
];
/** How far back the scheduled run retries unsent emails; older ones are left in-app only. */
const EMAIL_RETRY_DAYS = 3;
/** Event rows younger than this are left to their own after() send, avoiding a double email. */
const EMAIL_SETTLE_MINUTES = 10;
/** Upper bound on assets examined per warranty run; far above any realistic fleet's 90-day set. */
const WARRANTY_SCAN_LIMIT = 10_000;

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
  if (!pending.length) return summary;
  if (!summary.configured) {
    for (const row of pending) {
      const { subject, html } = renderNotificationEmail(row.userName, [
        { title: row.title, message: row.message, link: null },
      ]);
      await captureDevEmail(row.userEmail, subject, html);
    }
    return summary;
  }

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

/** An email with no in-app row behind it: a free-text owner (no login, and notifications.user_id
 * is NOT NULL) or the actor's own receipt (email only, by design). One-shot and untracked, so
 * the scheduled run doesn't retry it. */
async function sendUntrackedEmail(
  to: string,
  recipientName: string | null,
  title: string,
  message: string,
  link: string | null,
): Promise<void> {
  const { subject, html } = renderNotificationEmail(recipientName, [
    { title, message, link },
  ]);
  if (!isEmailConfigured()) {
    await captureDevEmail(to, subject, html);
    return;
  }
  try {
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error(`${LOG} untracked email to ${to} failed`, err);
  }
}

/** Dev only: with email switched off (NOTIFICATION_EMAIL_ENABLED=false), write what would have
 * been sent to .next/dev-outbox/ so notification emails can be checked without a mail server. */
async function captureDevEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (process.env.NODE_ENV !== "development") return;
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), ".next", "dev-outbox");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = to.replace(/[^a-z0-9]+/gi, "_");
    const header = `To: ${to} | Subject: ${subject}`.replace(/--/g, "- -");
    await writeFile(
      path.join(dir, `${stamp}_${slug}.html`),
      `<!-- ${header} -->\n${html}`,
    );
  } catch (err) {
    console.error(`${LOG} dev outbox write failed`, err);
  }
}

// ---------------------------------------------------------------------------------------------
// Event triggers: every user-involved asset action
// ---------------------------------------------------------------------------------------------

/** A lifecycle action that is more than a field edit (maintenance, disposal, deletion). The
 * caller words it, since only it knows what happened; `lead` is passive and is followed by
 * " by <actor>." (e.g. "Dell Latitude (HP-001) was sent for repair"). */
export interface AssetEventAction {
  type: NotificationType;
  ownerTitle: string;
  actorTitle: string;
  lead: string;
  /** Extra lines under the lead, e.g. the vendor or disposal method. */
  details?: string[];
}

export interface AssetEvent {
  /** Null for a newly created asset. */
  before: Asset | null;
  after: Asset;
  accessoryChanges?: AccessoryChange[];
  /** Free text entered with the action (status-change note, maintenance/disposal notes). */
  note?: string | null;
  action?: AssetEventAction;
}

/** "Dell Latitude 5440 (HP-0012)", how every asset notification names the asset. */
export function assetLabel(asset: Pick<Asset, "name" | "assetTag">): string {
  return `${asset.name} (${asset.assetTag})`;
}

type Owner =
  | { kind: "user"; userId: string }
  | { kind: "external"; name: string | null; email: string | null };

function ownerOf(asset: Asset): Owner | null {
  if (asset.assignedUserId) {
    return { kind: "user", userId: asset.assignedUserId };
  }
  if (asset.ownerName || asset.ownerEmail) {
    return { kind: "external", name: asset.ownerName, email: asset.ownerEmail };
  }
  return null;
}

function sameOwner(a: Owner | null, b: Owner | null): boolean {
  if (!a || !b) return a === b;
  if (a.kind === "user" || b.kind === "user") {
    return a.kind === "user" && b.kind === "user" && a.userId === b.userId;
  }
  if (a.email || b.email) {
    return a.email?.toLowerCase() === b.email?.toLowerCase();
  }
  return a.name === b.name;
}

/** The fields an owner cares about (per the change request): identity, where it is, what state
 * it's in. Purchase/finance, vendor, warranty, depreciation and notes stay internal. */
const OWNER_FIELDS: {
  label: string;
  value: (a: Asset) => string | number | null;
  lookup?: Exclude<LookupKind, "users">;
}[] = [
  { label: "Asset tag", value: (a) => a.assetTag },
  { label: "Name", value: (a) => a.name },
  { label: "Category", value: (a) => a.categoryId, lookup: "categories" },
  { label: "Model", value: (a) => a.modelNumber },
  { label: "Serial number", value: (a) => a.serialNumber },
  { label: "Location", value: (a) => a.locationId, lookup: "locations" },
  { label: "Department", value: (a) => a.departmentId, lookup: "departments" },
  { label: "Status", value: (a) => a.statusId, lookup: "statuses" },
  { label: "Condition", value: (a) => a.conditionId, lookup: "conditions" },
];
const MOVE_LABELS = new Set(["Location", "Department"]);

function accessoryLine(c: AccessoryChange): string {
  if (c.kind === "added") return `Accessory added: ${c.after}`;
  if (c.kind === "removed") return `Accessory removed: ${c.before}`;
  return `Accessory changed: ${c.before} → ${c.after}`;
}

const bullets = (lines: string[]) => lines.map((l) => `• ${l}`);
const joinLines = (lines: string[]) => lines.filter(Boolean).join("\n");

interface Notice {
  owner: Owner;
  type: NotificationType;
  title: string;
  message: string;
}

/** Decides and delivers the notifications for one committed, user-involved asset action. Rules
 * (confirmed with the stakeholder, see phase-7-notifications "Asset action emails"):
 *  - Only actions that involve an owner notify anyone: the asset has (or just lost) an owner.
 *  - New owner: asset_assigned (in-app + email). Previous owner: asset_unassigned.
 *  - Unchanged owner: told about owner-relevant field changes, accessory changes and lifecycle
 *    actions (asset_transferred when only location/department moved, else asset_updated or the
 *    action's own type). Internal-only edits (cost, vendor, notes...) notify nobody.
 *  - The actor gets an email-only receipt listing every change and who was told. An actor who
 *    is also the owner gets just that receipt, never a bell entry for their own action.
 *  - System users get an in-app row + tracked email; free-text owners the email only, if they
 *    have an address. Inactive users get nothing. */
export async function notifyAssetEvent(
  event: AssetEvent,
  actorId: string,
): Promise<void> {
  const { before, after: asset, action } = event;
  const prevOwner = before ? ownerOf(before) : null;
  const owner = ownerOf(asset);
  if (!owner && !prevOwner) return;
  const ownerChanged = !sameOwner(prevOwner, owner);

  const changedFields = before
    ? OWNER_FIELDS.filter(
        (f) => String(f.value(before) ?? "") !== String(f.value(asset) ?? ""),
      )
    : [];
  const accessoryChanges = event.accessoryChanges ?? [];
  if (
    !ownerChanged &&
    !changedFields.length &&
    !accessoryChanges.length &&
    !action
  ) {
    return;
  }

  const ids: LookupIds = {
    categories: [],
    locations: [asset.locationId],
    departments: [asset.departmentId],
    statuses: [],
    conditions: [],
    users: [actorId],
  };
  for (const f of changedFields) {
    if (!f.lookup) continue;
    for (const side of [before!, asset]) {
      const v = f.value(side);
      if (v != null) ids[f.lookup].push(Number(v));
    }
  }
  for (const o of [prevOwner, owner]) {
    if (o?.kind === "user") ids.users.push(o.userId);
  }
  const [names, accessories] = await Promise.all([
    resolveLookupNames(ids),
    ownerChanged && owner ? listAssetAccessories(asset.id) : null,
  ]);
  const nameOf = (kind: LookupKind, id: string | number | null) => {
    if (id == null) return "None";
    const name = names.get(`${kind}:${id}`) ?? String(id);
    return kind === "statuses" || kind === "conditions"
      ? formatLabel(name)
      : name;
  };
  const display = (f: (typeof OWNER_FIELDS)[number], a: Asset) =>
    f.lookup ? nameOf(f.lookup, f.value(a)) : String(f.value(a) ?? "None");
  const ownerName = (o: Owner | null) =>
    !o
      ? "Unassigned"
      : o.kind === "user"
        ? nameOf("users", o.userId)
        : (o.name ?? o.email ?? "Unnamed owner");

  const actorName = nameOf("users", actorId);
  const label = assetLabel(asset);
  const changeLines = [
    ...changedFields.map(
      (f) => `${f.label}: ${display(f, before!)} → ${display(f, asset)}`,
    ),
    ...accessoryChanges.map(accessoryLine),
  ];
  const whereLine = `Location: ${nameOf("locations", asset.locationId)} · Department: ${nameOf("departments", asset.departmentId)}`;
  const noteLine = event.note ? [`Note: ${event.note}`] : [];
  const leadBy = (who: string) =>
    action
      ? `${action.lead} by ${who}.`
      : !before
        ? `${label} was created by ${who}.`
        : `${label} was updated by ${who}.`;

  const notices: Notice[] = [];
  if (ownerChanged && owner) {
    const kit = accessories?.length
      ? [
          `Accessories: ${accessories.map((a) => formatAccessory(a)).join(", ")}`,
        ]
      : [];
    notices.push({
      owner,
      type: "asset_assigned",
      title: `Asset assigned to you: ${asset.assetTag}`,
      message: joinLines([
        `${label} was assigned to you by ${actorName}.`,
        ...bullets([whereLine, ...kit, ...(action?.details ?? [])]),
        ...noteLine,
      ]),
    });
  }
  if (ownerChanged && prevOwner) {
    notices.push({
      owner: prevOwner,
      type: "asset_unassigned",
      title: `Asset no longer assigned to you: ${asset.assetTag}`,
      message: owner
        ? `${label} was reassigned to ${ownerName(owner)} by ${actorName}.`
        : `${label} was unassigned from you by ${actorName}.`,
    });
  }
  if (!ownerChanged && owner) {
    const movedOnly =
      !action &&
      !accessoryChanges.length &&
      changedFields.every((f) => MOVE_LABELS.has(f.label));
    notices.push({
      owner,
      type: action?.type ?? (movedOnly ? "asset_transferred" : "asset_updated"),
      title: action
        ? `${action.ownerTitle}: ${asset.assetTag}`
        : movedOnly
          ? `Your asset was moved: ${asset.assetTag}`
          : `Your asset was updated: ${asset.assetTag}`,
      message: joinLines([
        movedOnly
          ? `${label}, assigned to you, was moved by ${actorName}.`
          : leadBy(actorName),
        ...bullets([...(action?.details ?? []), ...changeLines]),
        ...noteLine,
      ]),
    });
  }

  // Resolve who each notice actually reaches; the actor's own notices fold into their receipt.
  const told: string[] = [];
  const untold: string[] = [];
  const drafts: NotificationDraft[] = [];
  const external: { notice: Notice; email: string; name: string | null }[] = [];
  for (const notice of notices) {
    const o = notice.owner;
    if (o.kind === "user") {
      if (o.userId === actorId) continue;
      const recipient = await getActiveRecipient(o.userId);
      if (!recipient) {
        untold.push(`${ownerName(o)} (inactive account)`);
        continue;
      }
      drafts.push({
        userId: recipient.id,
        type: notice.type,
        title: notice.title,
        message: notice.message,
        relatedAssetId: asset.id,
      });
      told.push(recipient.fullName);
    } else if (o.email) {
      external.push({ notice, email: o.email, name: o.name });
      told.push(ownerName(o));
    } else {
      untold.push(`${ownerName(o)} (no email address)`);
    }
  }

  const created = await insertNotifications(drafts);
  await deliverPendingEmails(await listPendingEmails({ ids: created }));
  for (const { notice, email, name } of external) {
    await sendUntrackedEmail(email, name, notice.title, notice.message, null);
  }

  const actor = await getActiveRecipient(actorId);
  if (!actor) return;
  const ownerLine = ownerChanged
    ? [`Owner: ${ownerName(prevOwner)} → ${ownerName(owner)}`]
    : [];
  await sendUntrackedEmail(
    actor.email,
    actor.fullName,
    action
      ? `${action.actorTitle}: ${asset.assetTag}`
      : !before
        ? `You created ${asset.assetTag}`
        : `You updated ${asset.assetTag}`,
    joinLines([
      leadBy("you"),
      ...bullets([
        ...(action?.details ?? []),
        ...ownerLine,
        ...(before ? changeLines : [whereLine]),
      ]),
      ...noteLine,
      told.length ? `Notified: ${told.join(", ")}.` : "",
      untold.length ? `Not notified: ${untold.join(", ")}.` : "",
    ]),
    action?.type === "asset_deleted" ? null : appUrl(`/assets/${asset.id}`),
  );
}

/** Route-handler entry point: queue notifyAssetEvent() to run after the response is sent. Call
 * it only once the asset write has committed. Errors are logged, never surfaced to the user. */
export function scheduleAssetEventNotifications(
  event: AssetEvent,
  actorId: string,
): void {
  after(async () => {
    try {
      await notifyAssetEvent(event, actorId);
    } catch (err) {
      console.error(
        `${LOG} asset event notification failed for ${event.after.id}`,
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
  issueForms: IssueFormCheckSummary;
  email: EmailSummary;
}

/** The whole daily job. Idempotent: re-running creates nothing new (dedupe keys) and only emails
 * rows still unsent. The email pass covers this run's new alerts plus any earlier notification
 * (event-driven ones included) whose email failed within the last EMAIL_RETRY_DAYS. */
export async function runScheduledChecks(): Promise<ScheduledRunSummary> {
  const recipients = await listAlertRecipients();
  const warrantyExpiring = await runWarrantyExpiringCheck(recipients);
  const maintenanceDue = await runMaintenanceDueCheck(recipients);
  const issueForms = await runIssueFormChecks();
  const email = await deliverPendingEmails(
    await listPendingEmails({
      withinDays: EMAIL_RETRY_DAYS,
      settleMinutes: EMAIL_SETTLE_MINUTES,
      immediateTypes: SCHEDULED_TYPES,
    }),
  );
  return { warrantyExpiring, maintenanceDue, issueForms, email };
}
