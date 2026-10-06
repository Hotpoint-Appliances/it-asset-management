<!-- This file is for documenting proposed changes to various logic and UI in the project -->

Phase 8 and the final phase-completion-check are both done. The completion check passed, with one gap: I never triggered the root-level error page (global-error.tsx) live. As you asked, nothing is committed: 66 changed files are waiting for your review.

Checks run:

- The typecheck is clean, and lint is at 0 warnings, down from 2.
- npm run build succeeds. It was the project's first production build, and the built app started and answered requests.
- In the browser tests (Playwright, using the three deactivated test accounts from Phase 7):
  - About 70 checks failed only where my test scripts were wrong.
  - The other failures were 3 real defects, now fixed and re-tested (below).
  - No console warnings or errors, apart from the 404 page I opened on purpose.

What was built:

- Deactivation takes effect immediately. A deactivated user's next request is rejected and they're signed out; a role change applies without logging in again. proxy.ts now runs the same database check as the pages, so there's no redirect loop between / and /login.
- Sorting on the assets list. Only a fixed list of columns can be sorted, status and condition follow their admin-set order, and Export keeps the same sort.
- Field-level form errors in the asset form, login, five asset dialogs and all seven settings dialogs. Several unlabelled fields got labels too.
- Error pages for dashboard routes, the login/403 pages, and the root layout. They offer "Try again" and show a reference code, never the raw error message.
- Deployment: a rewritten README, docs/deployment.md (nginx → PM2 cluster, NSSM recommended for running both as services, a post-deployment checklist), and templates deploy/ecosystem.config.js and deploy/nginx-itam.conf.
  - nginx raises the upload limit to 12 MB, rate-limits login, and blocks /api/cron/ from outside.
  - New optional PG_POOL_MAX sets database connections per worker. .env.example is now tracked.
  - schema/ moved to the repo root.
- The notification script retries by itself, except after a timeout, because a second overlapping run could email the same digest twice. I only checked its syntax with PowerShell's parser; it was never run.

Defects the tests found, all fixed:

1. At 390 px, the users and vendors settings pages scrolled the whole page sideways: hidden button labels escaped the table's scroll box. Fixed once in the shared Table component.
2. Printing in dark mode came out as near-white text on white paper. Printing now always uses the light colours.
3. Three places used the UTC date as "today", so between midnight and 03:00 Nairobi time they showed yesterday: the default disposal date, the maintenance completion date and report filenames.
4. The sidebar breakpoint is now 1200 px everywhere, as you chose.

Things you should know:

- Email was switched on in your dev .env.local (NOTIFICATION_EMAIL_ENABLED unset), so test actions could have sent real email. I turned it off during testing and restored the file exactly afterwards. You may want to set NOTIFICATION_EMAIL_ENABLED=false there permanently.
- One email to a real inbox from an assignment is still unverified. It's on the post-deployment checklist with the other server checks.
- I couldn't check the 1000–1199 px range live: your Chrome window wouldn't resize below 1536 px. The CSS and the JS now use the same 1200 px value.
- A deleted or out-of-department asset page shows "not found" but returns HTTP 200. That's Next's streaming behaviour from earlier phases and harmless for an internal tool.

Every phase doc changed by this work is updated, along with the design system, conventions and lifecycle docs. phase-8-polish/SKILL.md has the full record of what was built and checked.
