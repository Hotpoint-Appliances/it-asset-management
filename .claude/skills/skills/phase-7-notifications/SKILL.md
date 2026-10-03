---
name: phase-7-notifications
description: Phase 7 — email notifications via MSAL/Microsoft Graph, in-app notification bell + /notifications page, the notification-trigger rules, and the secret-protected daily scheduled check triggered by a PowerShell script from Windows Task Scheduler. Depends on phase-6-dashboard-reporting.
---

# Phase 7 — Notifications

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].
Depends on `phase-6-dashboard-reporting` (reuses its warranty-expiring query as a trigger).

Before starting the Steps below, run [[phase-completion-check]] against
`phase-6-dashboard-reporting`'s exit criteria.

## Objective

In-app notifications (`notifications` table) plus outbound email via `@azure/msal-node` +
Microsoft Graph, driven by defined trigger events.

## Steps

1. **Graph email client** — `lib/email/graphClient.ts`: MSAL confidential-client app
   authentication (client credentials flow) using `MSAL_CLIENT_ID`/`MSAL_CLIENT_SECRET`/
   `MSAL_TENANT_ID` from `.env`; `lib/email/sendEmail.ts` wrapping the Graph `sendMail` call
   from `NOTIFICATION_FROM_EMAIL`.
2. **Notification triggers** — define as discrete functions, each inserting a `notifications`
   row and (if applicable) sending the email:
   - `asset_assigned` — fires when the owner is set/changed.
   - `asset_transferred` — fires on department/location change.
   - `maintenance_due` — fires when an `asset_maintenance` row's `scheduled_date` is reached
     (needs a scheduled check — see step 3).
   - `warranty_expiring` — reuses the Phase 6 warranty-expiring query, run on the same schedule.
   Exact recipient rules are under "Decisions made" below.
3. **Scheduled checks** — `warranty_expiring` and `maintenance_due` aren't triggered by a user
   action, so they run on a periodic job driven from outside Next.js:
   - `POST /api/cron/notifications-check` runs both checks and the email catch-up. All business
     logic stays in TypeScript — the PowerShell side is a thin trigger, not a second
     implementation.
   - Protected by `CRON_SECRET` (`Authorization: Bearer <CRON_SECRET>`, 401 otherwise; 503 if
     `CRON_SECRET` isn't set at all, so a misconfigured deploy fails closed).
   - `scripts/run-notifications-check.ps1` calls it and logs the summary/error to a local log
     file. **The Windows Task Scheduler registration steps live in that script's comment-based
     help** (`Get-Help .\scripts\run-notifications-check.ps1 -Full`), not in a separate doc. The
     task is registered by ops on the Windows Server host at deploy time — it is **not** set up
     from this repo. Default schedule: daily 07:00. Record the deployed time/host/account in the
     ops notes once registered.
4. **In-app notification bell** — topbar component showing unread count, dropdown list of recent
   `notifications` for the current user, mark-as-read on click, "mark all read", and a
   "View all" link into the `/notifications` page.
5. **Email failure handling** — `notifications.email_sent` tracks delivery; log and continue
   (never let a Graph API failure block the underlying asset action — send email as a
   best-effort side effect, never inside the asset mutation's DB transaction).

## Preamble: Phase 6 completion check

Phase 6's own doc left its browser verification pending. It was completed at the start of this
phase (headless Playwright with temporary admin/viewer users, plus the user's admin session in
Chrome) and all passed — see `phase-6-dashboard-reporting`'s "Verified" section. No Phase 6
defects were found.

## Decisions made (confirmed with the user before building)

- **Idempotent scheduled alerts via `notifications.dedupe_key`** (schema change,
  `schema/migrations/001_notifications_dedupe_key.sql`, folded into `schema.sql`): nullable
  column + partial unique index `(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`; inserts
  use `ON CONFLICT ... DO NOTHING`. Without it a daily run would re-send the same alert every
  day. Keys:
  - `warranty_expiring:<asset_id>:<warranty_expiry>:<window>` — one alert per configured window
    (`warranty_expiry_windows_days`, default 30/60/90). An asset is placed in the *narrowest*
    window its remaining days fall into, so a first run doesn't fire 90/60/30 all at once for
    something 10 days out. Including the expiry date means extending a warranty re-arms it.
  - `maintenance_due:<asset_maintenance.id>` — once per maintenance record.
  - Event types (`asset_assigned`/`asset_transferred`) leave it `NULL`.
- **Scheduled-alert recipients**: every active `admin` and `asset_manager` (asset managers are
  not department-scoped). `maintenance_due` also goes to the record's `created_by` if they're
  active and not already included. Viewers never receive scheduled alerts.
- **Event triggers are owner-centric and fire from every path that can change owner/location**:
  asset create (`POST /api/assets`), full edit (`PATCH /api/assets/[id]`) and transfer
  (`POST .../transfer`) — not only the transfer route as originally written.
  - `asset_assigned` → the newly assigned system user.
  - `asset_transferred` → the current owner, when location/department changes and the owner
    didn't. If both change in one save, the owner gets a single `asset_assigned` (its message
    carries the new location), not two.
  - Free-text owners (`owner_email`, no login) get the **email only** — `notifications.user_id` is
    `NOT NULL`, so there is no in-app row, and no retry.
  - The actor is never notified about their own change; inactive users get nothing.
- **Viewer link safety**: a viewer can be assigned an asset outside their department, which they
  can't open (404). The list query computes `assetViewable` per recipient (same rule as
  `getAssetById`); the UI/email render such notifications without a link.
- **One email per recipient per delivery**: several pending notifications are sent as a single
  digest (the first run on a real fleet could otherwise send dozens of mails per person).
- **Email retry in the scheduled run**: rows with `email_sent = false` from the last 3 days are
  retried. Event rows younger than 10 minutes are skipped (their own send may still be in
  flight) so the two paths can't double-send. The 3-day bound stops a long outage ending in a
  flood.
- **`NOTIFICATION_EMAIL_ENABLED=false`** (new env var) turns email off while keeping the MSAL
  credentials — for dev/staging databases whose users are real people. Rows are still created
  (with `email_sent = false`).
- **Full `/notifications` page** (paginated, All/Unread filter, per-row read/unread toggle, mark
  all read), which Phase 8's empty-state checklist already expected.
- **Email is sent via Next's `after()`** (`next/server`), after the response is sent — the
  asset write commits and responds first; the in-app row insert + Graph call happen afterwards.

## Confirmed as built

- **`lib/email/graphClient.ts`**: `isEmailConfigured()` (all MSAL vars + sender, and not disabled
  by `NOTIFICATION_EMAIL_ENABLED=false`), `getGraphAccessToken()` — one
  `ConfidentialClientApplication` per process on `globalThis` (MSAL caches the app token).
  **`lib/email/sendEmail.ts`**: `POST /v1.0/users/{sender}/sendMail`, 15 s timeout, throws on
  non-2xx. **`lib/email/templates.ts`**: `renderNotificationEmail()` (single item or digest,
  inline-styled, HTML-escaped) and `appUrl()` (absolute links from `ITAM_APP_URL`; no link if
  unset).
- **`lib/db/notifications.ts`**: `insertNotifications()` (bulk `unnest`, dedupe via
  `ON CONFLICT`, returns created ids), `listNotificationsForUser()` (paginated, `unreadOnly`,
  `assetViewable` in SQL), `setNotificationRead()`/`markAllNotificationsRead()` (always scoped to
  the session user), `listPendingEmails()`, `markEmailsSent()`, `listAlertRecipients()`,
  `getActiveRecipient()`. `lib/db/maintenance.ts` gained `listMaintenanceDue()` (status
  `scheduled`, `scheduled_date <= CURRENT_DATE`, asset not disposed/soft-deleted).
- **`lib/notifications/triggers.ts`**: `scheduleAssetChangeNotifications()` (wraps
  `notifyAssetChange()` in `after()`, catches and logs), `runWarrantyExpiringCheck()` (reuses
  Phase 6's `listWarrantyExpiring()` with an unscoped requester), `runMaintenanceDueCheck()`,
  `runScheduledChecks()`. Errors are logged with a `[notifications]` prefix.
- **`updateAsset()`/`transferAsset()` now return `AssetChange` (`{ before, after }`)** instead of
  `Asset` — `before` is the row as the update's own `FOR UPDATE` read saw it, so triggers diff
  the locked pre-update state rather than a separate, racy read. Their two routes were updated;
  `changeAssetCondition`/`changeAssetStatus` still return `Asset`.
- **API**: `GET /api/notifications` (`limit` ≤ 50, `offset`, `unread=1`; returns `items`,
  `total`, `unreadCount`), `PATCH /api/notifications/[id]` (`{ isRead }`; someone else's id is a
  404), `POST /api/notifications/read-all`, `POST /api/cron/notifications-check` (constant-time
  secret compare; returns a JSON summary — matched/created per check, email
  configured/recipients/sent/failed).
- **UI**: `components/notifications/NotificationBell.tsx` replaces the Topbar's placeholder bell
  (unread badge, `aria-label` carries the count, the list scrolls inside a pinned header/footer,
  titles clamp to 2 lines), `NotificationItem.tsx` (shared row; unread = dot + bold + sr-only
  text, not colour alone), `NotificationsList.tsx` + `app/(dashboard)/notifications/{page,loading}.tsx`.
  `lib/hooks/useNotifications.ts`: TanStack Query, shared `["notifications"]` key prefix so the bell
  and page stay in sync; polls every 60 s and on window focus. No sidebar nav entry — the bell is
  the entry point.
- **`scripts/run-notifications-check.ps1`**: Windows PowerShell 5.1-compatible; `-AppUrl`
  (default `$env:ITAM_APP_URL`), secret from `-SecretFile` (default
  `C:\ProgramData\ITAM\cron-secret.txt`, ACL'd to SYSTEM/Administrators) falling back to
  `$env:ITAM_CRON_SECRET`; forces TLS 1.2; logs to
  `C:\ProgramData\ITAM\logs\notifications-check.log` (rolled at 5 MB); exits 1 on failure so
  Task Scheduler's Last Run Result shows it. Its help block contains the full setup: secret file
  + `icacls`, a manual test run, `Register-ScheduledTask` (daily 07:00, SYSTEM,
  `-StartWhenAvailable`, 3 restarts at 15 min, 10 min limit), verify, change time, remove.

## Verified

- `tsc --noEmit` and `npm run lint` clean (only the two pre-existing Phase 4 `AssetQrCode`
  warnings); new/changed files Prettier-formatted.
- Migration applied to the dev DB; column and both indexes confirmed via `information_schema`
  and `pg_indexes`.
- **Scheduled checks, through the real PowerShell script** against the dev server: a wrong
  secret logs `HTTP 401` and exits 1. The first run matched 6 warranty assets and 1 overdue
  maintenance record, each cross-checked by hand against SQL (windows 30/30/30/60/90/90;
  disposed, expired and >90-day assets excluded; the future-dated maintenance excluded). It
  created 18 + 3 rows for the 3 admin/manager recipients. A **second run created 0**. Moving a
  warranty into the 30-day window created 3 new alerts; restoring the date created none. The
  env-var secret fallback was also exercised.
- **Event triggers** (Playwright, temporary admin/asset_manager/viewer users, 34 checks, zero
  console errors): create/edit/transfer each produce the right type for the right user; the actor
  is never notified (including self-assignment); assign + move in one save gives one
  notification; a no-op edit gives none; free-text owner gives no in-app row; a viewer's
  out-of-department notification has `assetViewable=false` (the asset itself 404s for them);
  anonymous → 401; another user's notification → 404; bad body → 400; viewers get no scheduled
  alerts.
- **Bell and page**: unread count in `aria-label`, dropdown lists items, mark all read resets the
  badge and the DB, "View all" navigates, a per-row toggle on the page updates the bell (shared
  cache), the Unread filter shows its empty state, and clicking an alert opens the asset. At
  390px there's no horizontal scroll and the menu fits the viewport; checked in light and dark.
- **Email failure is non-blocking** (real Graph failure: a nonexistent sender mailbox): the
  transfer returned 200 in 155 ms with its audit row committed, the notification stayed
  `email_sent = false`, and the cron summary reported `failed: 3, sent: 0`. MSAL token
  acquisition was confirmed separately (token carries the `Mail.Send` app role), so the failure
  was the sender, not credentials.
- **One live email** (with the user's consent) to `geoffrey@hotpoint.co.ke`: a digest of 8
  pending alerts via the PowerShell script → `sent to 1 of 1 recipient(s)`; rows marked
  `email_sent = true`.
- **Not verified**: delivery of an event email (`asset_assigned`) to a real inbox (the digest path
  shares the same sender/template code); the free-text-owner email (would have gone to an
  external address); an actual Task Scheduler registration (deferred to deploy, see Step 3).

## Re-verified before Phase 8 (via `phase-completion-check`)

Passed with no defects: `tsc` clean, lint at the recorded 2 warnings, every Produces file present,
migration 001 + both indexes confirmed in the dev DB, `/notifications` and the bell checked in the
user's Chrome session (no console errors, no horizontal scroll), cron route 401 with no/wrong
secret (rejected before any check logic runs). The PowerShell script was reviewed statically only
(not run), per the user's instruction: its logic and the route's response shape agree. One
finding: email was **live** in the dev `.env.local` (`NOTIFICATION_EMAIL_ENABLED` unset), so
Phase 8 set it to `false` for its own test runs and restored the file byte-identical afterwards.

## Changed by Phase 8

- `scripts/run-notifications-check.ps1` now retries by itself (`-MaxAttempts 3`,
  `-RetryDelaySeconds 300`) on connection failures and 5xx other than 503, and never on
  401/503 (config) or a **timeout** (the run may still be emailing; a second overlapping run could
  double-send). The help's `-RestartCount` claim was wrong (Task Scheduler restarts on launch
  failure, not on exit code 1) and is gone; the task example now uses `-ExecutionTimeLimit 30 min`
  and `-MultipleInstances IgnoreNew`. Static review + a parse-only syntax check; still never run.
- The task calls **`-AppUrl http://127.0.0.1:3000`** (the PM2 port) instead of the public URL;
  nginx also returns 404 for `/api/cron/*` from outside. `ITAM_APP_URL` stays the public URL for
  email links and QR labels.
- The deploy-time items in the Exit criteria below moved into `docs/deployment.md`'s post-deploy
  sign-off checklist (including the still-unverified real-inbox `asset_assigned` email).

## Exit criteria

- Assigning/transferring an asset produces both an in-app notification and (if Graph is
  configured) an email to the relevant user — verified (in-app live; email via the shared
  delivery path, live digest sent).
- Warranty-expiring and maintenance-due checks correctly identify matching assets when run
  manually against test data — verified against hand-written SQL, and idempotent on re-run.
- A Graph/email failure is logged but does not roll back or block the triggering asset action —
  verified with a real Graph failure.
- **Deploy-time (ops) item, outside this repo**: apply migration 001 to each environment's DB,
  set `CRON_SECRET`/`ITAM_APP_URL` in the app's env, and register the Task Scheduler task per the
  script's help. Phase 8's QA pass should confirm this on the server.

## Produces (for later phases to reference)

- `schema/migrations/001_notifications_dedupe_key.sql` (first migration; `schema.sql` updated)
- `lib/email/{graphClient,sendEmail,templates}.ts`
- `lib/notifications/triggers.ts`; `lib/db/notifications.ts`; `listMaintenanceDue()` in
  `lib/db/maintenance.ts`; `AssetChange` type exported by `lib/db/assets.ts`
- `app/api/notifications/route.ts` (GET), `[id]/route.ts` (PATCH), `read-all/route.ts` (POST);
  `app/api/cron/notifications-check/route.ts` (POST, secret-protected)
- `app/(dashboard)/notifications/{page,loading}.tsx`;
  `components/notifications/{NotificationBell,NotificationItem,NotificationsList}.tsx`;
  `lib/hooks/useNotifications.ts`; `types/notification.ts`
- `scripts/run-notifications-check.ps1` (Task Scheduler setup in its help block)
- New env var `NOTIFICATION_EMAIL_ENABLED`; `ITAM_APP_URL` is now also the base for email links

## Related skills

- `skills/phase-5-asset-lifecycle` — its transfer route (and the Phase 4 create/edit routes) call
  `scheduleAssetChangeNotifications()`
- `skills/phase-6-dashboard-reporting` — source of the warranty-expiring query reused here
- `skills/phase-8-polish` — audits the bell and `/notifications` page, and confirms the deployed
  scheduled task
