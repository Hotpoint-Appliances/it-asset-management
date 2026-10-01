import { query } from "./query";
import { toIsoString } from "./dates";
import type {
  Notification,
  NotificationPage,
  NotificationType,
} from "@/types/notification";

export interface NotificationDraft {
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  relatedAssetId: string | null;
  /** Set for scheduled alerts only; see schema/migrations/001_notifications_dedupe_key.sql. */
  dedupeKey?: string | null;
}

/** Inserts the drafts in one statement and returns the ids of the rows actually created: a draft
 * whose (user_id, dedupe_key) already exists is skipped by the partial unique index, which is
 * what makes the daily scheduled check safe to repeat. */
export async function insertNotifications(
  drafts: NotificationDraft[],
): Promise<number[]> {
  if (!drafts.length) return [];
  const result = await query<{ id: string }>(
    `INSERT INTO notifications (user_id, type, title, message, related_asset_id, dedupe_key)
     SELECT * FROM unnest($1::uuid[], $2::varchar[], $3::varchar[], $4::text[], $5::uuid[], $6::varchar[])
     ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
     RETURNING id`,
    [
      drafts.map((d) => d.userId),
      drafts.map((d) => d.type),
      drafts.map((d) => d.title),
      drafts.map((d) => d.message),
      drafts.map((d) => d.relatedAssetId),
      drafts.map((d) => d.dedupeKey ?? null),
    ],
  );
  return result.rows.map((r) => Number(r.id));
}

interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  related_asset_id: string | null;
  asset_viewable: boolean;
  is_read: boolean;
  created_at: Date | string;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: Number(row.id),
    type: row.type,
    title: row.title,
    message: row.message,
    relatedAssetId: row.related_asset_id,
    assetViewable: row.asset_viewable,
    isRead: row.is_read,
    createdAt: toIsoString(row.created_at)!,
  };
}

/** Whether the recipient could open the related asset: the same rule as getAssetById (not
 * soft-deleted; viewers only within their own department), resolved in SQL so a notification
 * about an asset they can't see isn't rendered as a link to a 404. */
const ASSET_VIEWABLE = `(a.id IS NOT NULL AND a.deleted_at IS NULL
  AND (r.name <> 'viewer' OR a.department_id = u.department_id))`;
const VIEW_JOINS = `JOIN users u ON u.id = n.user_id
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN assets a ON a.id = n.related_asset_id`;

export async function listNotificationsForUser(
  userId: string,
  {
    limit,
    offset,
    unreadOnly,
  }: { limit: number; offset: number; unreadOnly: boolean },
): Promise<NotificationPage> {
  const [rows, counts] = await Promise.all([
    query<NotificationRow>(
      `SELECT n.id, n.type, n.title, n.message, n.related_asset_id, n.is_read, n.created_at,
              ${ASSET_VIEWABLE} AS asset_viewable
       FROM notifications n ${VIEW_JOINS}
       WHERE n.user_id = $1 AND ($2::boolean IS FALSE OR n.is_read = FALSE)
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT $3 OFFSET $4`,
      [userId, unreadOnly, limit, offset],
    ),
    query<{ total: number; unread: number }>(
      `SELECT count(*) FILTER (WHERE $2::boolean IS FALSE OR NOT is_read)::int AS total,
              count(*) FILTER (WHERE NOT is_read)::int AS unread
       FROM notifications WHERE user_id = $1`,
      [userId, unreadOnly],
    ),
  ]);
  return {
    items: rows.rows.map(mapNotification),
    total: counts.rows[0].total,
    unreadCount: counts.rows[0].unread,
  };
}

/** Scoped to `userId` so one user can never flip another's notification; false if no such row. */
export async function setNotificationRead(
  id: number,
  userId: string,
  isRead: boolean,
): Promise<boolean> {
  const result = await query(
    `UPDATE notifications SET is_read = $3 WHERE id = $1 AND user_id = $2`,
    [id, userId, isRead],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  const result = await query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
  return result.rowCount ?? 0;
}

export interface PendingEmail {
  id: number;
  userEmail: string;
  userName: string;
  title: string;
  message: string | null;
  relatedAssetId: string | null;
  assetViewable: boolean;
}

/** Notification rows still owed an email, for active users only. `ids` narrows to specific rows
 * (the event path right after it inserts them); otherwise it's the scheduled check's catch-up
 * query: unsent rows from the last `withinDays` days, skipping event rows younger than
 * `settleMinutes` whose own after()-scheduled send may still be in flight, so the two paths
 * don't double-send. The day bound stops a long email outage from ending in a mail flood. */
export async function listPendingEmails(
  opts:
    | { ids: number[] }
    | {
        withinDays: number;
        settleMinutes: number;
        immediateTypes: NotificationType[];
      },
): Promise<PendingEmail[]> {
  const byIds = "ids" in opts;
  const result = await query<{
    id: string;
    email: string;
    full_name: string;
    title: string;
    message: string | null;
    related_asset_id: string | null;
    asset_viewable: boolean;
  }>(
    `SELECT n.id, u.email, u.full_name, n.title, n.message, n.related_asset_id,
            ${ASSET_VIEWABLE} AS asset_viewable
     FROM notifications n ${VIEW_JOINS}
     WHERE n.email_sent = FALSE AND u.is_active
       AND ${
         byIds
           ? `n.id = ANY($1::bigint[])`
           : `n.created_at > now() - make_interval(days => $1::int)
              AND (n.type = ANY($3::varchar[]) OR n.created_at < now() - make_interval(mins => $2::int))`
       }
     ORDER BY u.email, n.created_at`,
    byIds
      ? [opts.ids]
      : [opts.withinDays, opts.settleMinutes, opts.immediateTypes],
  );
  return result.rows.map((r) => ({
    id: Number(r.id),
    userEmail: r.email,
    userName: r.full_name,
    title: r.title,
    message: r.message,
    relatedAssetId: r.related_asset_id,
    assetViewable: r.asset_viewable,
  }));
}

export async function markEmailsSent(ids: number[]): Promise<void> {
  if (!ids.length) return;
  await query(
    `UPDATE notifications SET email_sent = TRUE WHERE id = ANY($1::bigint[])`,
    [ids],
  );
}

export interface Recipient {
  id: string;
  email: string;
  fullName: string;
}

/** Recipients of the scheduled alerts (warranty_expiring / maintenance_due): every active admin
 * and asset_manager. Asset managers aren't department-scoped, so there's no per-asset filter. */
export async function listAlertRecipients(): Promise<Recipient[]> {
  const result = await query<{ id: string; email: string; full_name: string }>(
    `SELECT u.id, u.email, u.full_name FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.is_active AND r.name IN ('admin', 'asset_manager') ORDER BY u.full_name`,
  );
  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
  }));
}

/** Null for an unknown or deactivated user: they get neither an in-app row nor an email. */
export async function getActiveRecipient(
  userId: string,
): Promise<Recipient | null> {
  const result = await query<{ id: string; email: string; full_name: string }>(
    `SELECT id, email, full_name FROM users WHERE id = $1 AND is_active`,
    [userId],
  );
  const row = result.rows[0];
  return row ? { id: row.id, email: row.email, fullName: row.full_name } : null;
}
