<!-- This file is for documenting proposed changes to various logic and UI in the project -->

Phase 7 is built and verified, and Phase 6 is fully closed. Typecheck and Prettier are clean, and lint shows only the two warnings that were already there. Nothing is committed yet.

Phase 6 check: its doc still had the browser verification marked pending, so I ran it first. Everything passed with no console errors: viewer 403s, all four report downloads, the DatePicker inside a Dialog (keyboard selection and Escape), the Assets Export button, and a 390px pass. I updated the Phase 6 doc to record this.

What I built:

- Schema change: the notifications table gets a dedupe column, so the daily run can't send the same alert twice. The migration file is .claude/skills/schema/migrations/001_notifications_dedupe_key.sql, it's also folded into schema.sql, and it's applied to your dev DB.
- Email: MSAL + Graph sending in lib/email/. Several pending notifications for the same person go out as one digest email.
- Triggers: asset_assigned and asset_transferred fire from asset create, full edit and transfer. They run after the response is sent, so a slow or failing email can't delay or undo the asset change.
- Warranty alerts: at most one per asset per window (e.g. 90/60/30 days), using the narrowest window the asset is in. Extending a warranty re-arms them.
- Retry: each scheduled run retries emails that failed in the last 3 days.
- UI: the bell in the topbar, a new /notifications page, and the API routes behind them.
- Cron route: /api/cron/notifications-check, protected by CRON_SECRET. It refuses to run at all if the secret isn't set.
- scripts/run-notifications-check.ps1: as you asked, the Task Scheduler setup steps are in the script's help block; nothing is registered yet. The steps cover storing the secret in a locked-down file, a manual test run, registering a daily 07:00 task with retries, and how to check, change or remove it.

Things I added beyond the original plan:

- NOTIFICATION_EMAIL_ENABLED=false: a new env var that turns email off while keeping the credentials. Your dev DB has real addresses (you and testuser@hotpoint.co.ke), and I needed this to test without emailing anyone. It's worth keeping for staging.
- Return type change: updateAsset and transferAsset now return both the old and new asset, so the triggers compare against the row as it was locked during the update. Only their two routes needed changing.
- Bell fixes: titles now wrap to two lines instead of cutting off the asset tag, and the header and footer stay pinned while only the list scrolls. Before, "View all" was hidden once the list got long.

Verified:

- PowerShell script: a wrong secret exits 1. A second run created no new notifications. The matched warranty and maintenance records agree with hand-written SQL.
- Events, API and UI: 34 Playwright checks, zero console errors, in light and dark and at 390px.
- Email failure: a real Graph failure (a sender mailbox that doesn't exist) didn't block the transfer: it returned 200 in 155 ms and the notification stayed marked unsent.
- Live email: exactly one went out, a digest of 8 alerts to geoffrey@hotpoint.co.ke. Please check it arrived.

Not verified: an assignment email landing in a real inbox (it uses the same sending code as the digest), the email to owners with no login, and the actual Task Scheduler registration. Phase 8 now has a checklist item for the server setup.

Cleanup: .env.local is byte-identical to your original. The temporary test users are deactivated and the test asset is soft-deleted. The DEMO-003 warranty date I moved for testing is restored.

Before deploying:

- .env.example is matched by .env* in .gitignore, so the new variable documented there won't be committed. Unignore it if you want it tracked.
- Each environment's database needs migration 001 applied before this code runs, because the insert depends on the new column.
- Scope the Azure app's Mail.Send permission to the sender mailbox with an Exchange application access policy. Its token currently carries Mail.Send as an application permission, which means it can send as any mailbox in the tenant unless you restrict it.

✻ Cogitated for 31m 10s · done 4:01 PM

※ recap: Phase 7 notifications are built and verified: email, bell, notifications page, and the daily check script, with Phase 6's browser check also closed. Next, check that the one test digest email reached geoffrey@hotpoint.co.ke, then review and commit. (disable recaps in /config)
