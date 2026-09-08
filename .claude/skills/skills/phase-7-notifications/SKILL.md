---
name: phase-7-notifications
description: Phase 7 — email notifications via MSAL/Microsoft Graph, in-app notification bell, and the notification-trigger rules. Depends on phase-6-dashboard-reporting.
---

# Phase 7 — Notifications

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]]. Depends on
`phase-6-dashboard-reporting` (reuses its warranty-expiring and in-repair queries as triggers).

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
   - `asset_assigned` — fires when `assigned_user_id` is set/changed (Phase 5 transfer action
     calls this).
   - `asset_transferred` — fires on department/location change, notifying the new department's
     relevant users or the asset owner.
   - `maintenance_due` — fires when an `asset_maintenance` row's `scheduled_date` is reached
     (needs a scheduled check — see step 3).
   - `warranty_expiring` — reuses the Phase 6 warranty-expiring query, run on the same schedule.
3. **Scheduled checks (confirmed mechanism)** — `warranty_expiring` and `maintenance_due`
   aren't triggered by a user action, so they run on a periodic job driven from outside
   Next.js:
   - Build `POST /api/cron/notifications-check` as a route handler that runs both checks and
     inserts/sends the resulting notifications. Keep all business logic here in TypeScript —
     the PowerShell side stays a thin trigger, not a second implementation of the trigger logic.
   - Protect the route with a shared secret: add `CRON_SECRET` to `.env`, require a
     `Authorization: Bearer <CRON_SECRET>` header, reject with 401 otherwise. This endpoint
     must never be callable by an unauthenticated request even though it needs no user
     session.
   - Ship a PowerShell script (`scripts/run-notifications-check.ps1`) that does
     `Invoke-RestMethod -Uri $env:ITAM_APP_URL/api/cron/notifications-check -Method Post
     -Headers @{ Authorization = "Bearer $env:ITAM_CRON_SECRET" }`, logging the response and
     any error to a local log file for ops visibility.
   - Register that script as a **Windows Task Scheduler** task on the Windows Server host
     running the app. A daily run (e.g. 07:00) is sufficient for warranty/maintenance-due
     checks — these aren't minute-sensitive. Document the exact trigger frequency alongside
     the deployed task once set up; it's an ops decision, not a code decision.
4. **In-app notification bell** — topbar component (from the Phase 1 app shell) showing unread
   count, dropdown list of recent `notifications` for the current user, mark-as-read on click,
   "mark all read" action.
5. **Email failure handling** — `notifications.email_sent` tracks delivery; log and continue
   (never let a Graph API failure block the underlying asset action, e.g. a transfer must
   succeed even if the notification email fails — send email as a best-effort side effect, not
   inside the same DB transaction as the asset mutation).

## Exit criteria

- Assigning/transferring an asset produces both an in-app notification and (if Graph is
  configured) an email to the relevant user.
- Warranty-expiring and maintenance-due checks correctly identify matching assets when run
  manually against test data.
- A Graph/email failure is logged but does not roll back or block the triggering asset action.

## Produces (for later phases to reference)

- `lib/email/{graphClient,sendEmail}.ts`
- `lib/notifications/triggers.ts`
- Notification bell component
- `/api/cron/notifications-check` (secret-protected)
- `scripts/run-notifications-check.ps1` + a Windows Task Scheduler task on the app server

## Related skills

- `skills/phase-5-asset-lifecycle` — calls `asset_assigned`/`asset_transferred` triggers
- `skills/phase-6-dashboard-reporting` — source of the warranty-expiring query reused here
