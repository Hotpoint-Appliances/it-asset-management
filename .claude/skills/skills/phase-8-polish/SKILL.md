---
name: phase-8-polish
description: Phase 8 — final theming/responsive/accessibility sweep, error boundaries, session revocation, assets-list sorting, form error a11y, deployment runbook, and the MVP end-to-end QA pass. Depends on phase-7-notifications. Last phase.
---

# Phase 8 — Polish, Hardening & QA

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].
Depends on `phase-7-notifications` (and transitively on phases 1–7 being functionally complete).

Before starting the Checklist below, run [[phase-completion-check]] against
`phase-7-notifications`'s exit criteria (the closest predecessor — phases 1–6 were each already
gated on entry by their own successor). Phase 7's **deploy-time (ops)** exit item is not a
blocker here: verify only the repo side (script exists, its logic matches the route), per
[[phase-completion-check]]'s deploy-time rule. Do **not** run `scripts/run-notifications-check.ps1`
or register a scheduled task during this phase.

## Objective

Close the gap between "functionally complete" and "production-feel": a sweep that finds and
fixes what phases 1–7 left inconsistent, plus four small, pre-agreed hardening items (A–D below).
No new schema, no new dependencies, no new modules.

## Pre-audit (done while writing this file, 2026-10-02 — re-confirm, don't assume)

A read-only scan of the repo at commit `595bbdd` found these concrete gaps; the Checklist below
is written against them:

- **No `error.tsx` or `global-error.tsx` anywhere** — a thrown server-component query shows
  Next's bare default error page. `not-found.tsx` exists (root, session-aware; and
  `(dashboard)/not-found.tsx`), `/403` exists, and every dashboard route already has a
  `loading.tsx` with a shape-matched skeleton.
- **Sessions are never revoked.** `getSession()`/`getApiSession()` only verify the JWT; nothing
  re-reads `users`. A deactivated user (or a downgraded role/department) keeps full access until
  the 8 h token expires. Phase 3's "deactivate → login fails" check only proved *new* logins fail.
- **No list view sorts**, although [[itam-design-system]] says list pages have column sorting.
- **No field is ever marked invalid.** Every form shows one server error string in a
  `role="alert"` block; `aria-describedby`/`aria-invalid` appear only in `QuickActions.tsx`.
- **Destructive dialogs in the seven settings managers** state their consequence in
  `DialogBody`, not `DialogDescription` (the design system requires the latter for destructive
  dialogs; Radix also logs a missing-description warning). Asset dispose/soft-delete use
  `ConfirmDialog`, which is correct.
- **Mutation pattern drift**: [[itam-design-system]] says mutations go through TanStack Query
  `useMutation`; in reality only `useNotifications.ts` does — everything else is
  `axios` + `useRouteLoadingRouter().refresh()` + toast. That works and is consistent; fix the
  **doc**, don't rewrite the mutations.
- `npm run lint`: the two long-standing `components/assets/AssetQrCode.tsx` warnings (an unused
  `eslint-disable` and `no-img-element` on a `data:` URI QR, where `next/image` adds nothing).
- `app/api/health/route.ts` is unauthenticated and returns the raw DB error `message` on failure
  (can leak host/user names).
- `.env.example` exists but is untracked: `.gitignore`'s `.env*` matches it.
- `README.md` is still the `create-next-app` boilerplate; there is no deployment documentation
  (process hosting, HTTPS, migrations, first admin, Task Scheduler) anywhere.
- `docs/asset-lifecycle-flow.md` rule 1 still says default status is `active` if "an owner/location
  is set" — Phase 4 implemented owner-only (location is always required) and flagged it for
  confirmation, which never happened.
- `scripts/run-notifications-check.ps1` (static review, not run): logic is correct — fail-closed
  on missing URL/secret, TLS 1.2, Bearer header, summary fields match `ScheduledRunSummary`,
  401/503 hints, exit 1 on failure. One doc-level concern: its help says
  `-RestartCount`/`-RestartInterval` retry "if the app was down (the script exits 1)". Task
  Scheduler's restart-on-failure is aimed at the *task failing to run*, not at the action's
  non-zero exit code, so that retry most likely never fires. See item D3.
- Live (user's Chrome admin session): `/notifications` renders, bell present, no console errors,
  no horizontal scroll; `POST /api/cron/notifications-check` with no/wrong secret → 401 before any
  check logic runs.

## Decisions made (confirmed with the user before building)

- **Session revocation is fixed in this phase** (A).
- **Form errors: lightweight** (C) — client-side per-field checks with `aria-invalid` +
  `aria-describedby`; server errors stay form-level. No API response shape change.
- **Sorting: assets list only** (B); settings tables stay unsorted (small, already name-ordered),
  and [[itam-design-system]] is updated to say so.
- **Deployment: write the runbook, defer the server** (D). On-server verification becomes a
  post-deploy sign-off list in the runbook, not a Phase 8 exit criterion.
- **Default status on creation is owner-only**: `active` when an owner is set, otherwise
  `in_storage` (what Phase 4 built). Fix the lifecycle doc's wording; no code change.
- **Schema moves to a top-level `schema/` folder** (`schema.sql` + `migrations/`), out of
  `.claude/skills/`, so deployment doesn't depend on the `.claude` folder (D2).
- **Scheduled-task retry lives inside the script** (D3), not in Task Scheduler settings.

## Hardening items (agreed scope)

### A. Session revocation

- In `lib/auth/session.ts`, after verifying the JWT, load the user by `userId` (one PK lookup:
  `is_active`, role name, `department_id`, `full_name`, `email`) and return `null` if missing or
  inactive. Return the **DB's** current role/department/name in the payload rather than the
  token's, so a role or department change takes effect on the next request. Don't try to
  re-sign the cookie from `getSession()` — cookies can't be set during a Server Component render.
- Wrap the lookup in React `cache()` so the root layout, `(dashboard)/layout.tsx` and the page
  share one query per request. `getApiSession()` (`lib/auth/api.ts`) must go through the same
  path, so route handlers also return 401 for a deactivated user.
- **`proxy.ts` calls `getSession()` too** (it verifies the JWT, not just cookie presence, and
  redirects *away* from `/login` when that succeeds). Every caller must therefore agree on
  "valid": if the proxy kept a token-only check while the layout rejected an inactive user, the
  layout would send them to `/login` and the proxy would bounce them back to `/`, an infinite
  redirect loop. Pick one of these and state it in the code comment:
  (a) the proxy uses the same DB-backed `getSession()`. It costs one PK query per navigation, and
  the proxy runs on the Node runtime in Next 16, so `pg` works there. Confirm in
  `node_modules/next/dist/docs` before relying on it. When the token is valid but the user is
  rejected, **delete the `itam_session` cookie on the redirect response**; or
  (b) split out a token-only `verifySessionToken()` for the proxy's protected-path check, and make
  the `/login` redirect-away branch use the DB-backed result. Recommended: (a). It's simpler and
  the cookie clean-up happens in one place.
  Verify there's no redirect loop in either direction.
- Verify live: log in as a temporary user in a second browser context, deactivate them as admin,
  and confirm their next page load lands on `/login` and their next API call 401s. Repeat with a
  role downgrade (`asset_manager` → `viewer`): the Actions menu disappears and lifecycle POSTs
  403 without re-login.

### B. Assets list sorting

- `?sort=<column>&dir=asc|desc` on `GET /api/assets` and the `/assets` page. `listAssets` maps a
  **whitelist** (tag, name, category, status, condition, location, department, owner, updated)
  to SQL expressions. Never interpolate the raw param; an unknown value falls back to the
  current default order. Keep a stable tiebreaker (`a.id`) so pagination doesn't shuffle.
- Clickable headers with `aria-sort` and an icon (`ArrowUp`/`ArrowDown`/`ArrowUpDown` from
  lucide), via `useRouteLoadingRouter` like the existing filters. Sorting resets `offset` to 0.
- The list's **Export** button forwards `sort`/`dir` too, so the register matches the screen.
  `buildAssetFilterClause` is shared with `lib/db/reports.ts`; keep the order-by builder next to it.
- Settings tables: unchanged. Update [[itam-design-system]]'s list-page bullet accordingly.

### C. Form error accessibility (lightweight)

- For each form (asset create/edit, login, Transfer/Condition/Status/Disposal/Maintenance
  dialogs, the seven settings create/edit dialogs, the user form): on submit, run the cheap
  client checks the server would reject anyway (required fields, email shape, numbers ≥ 0,
  warranty/purchase date order where the validator checks it). Mark offending inputs
  `aria-invalid="true"`, render the message under the field with an `id`, and point
  `aria-describedby` at it. Focus the first invalid field. Don't send the request when a client
  check fails.
- Style invalid inputs via `aria-invalid:` utilities in `Input`/`Select`/`DatePicker`
  (`border-destructive`, focus ring in destructive), once in the primitives, not per call site.
  `DatePicker` and the Radix `Select` trigger must forward `aria-invalid`/`aria-describedby`.
- Server errors keep the existing form-level `role="alert"` block. The server stays the source
  of truth; client checks are a UX layer.
- Keep `RequiredMark` usage consistent with what the client actually enforces.

### D. Deployment runbook (documentation; server deferred)

1. Replace the boilerplate `README.md` with a project README: what the app is, local dev
   (`.env.local` from `.env.example`, `npm run dev`, `npm run seed:admin`, `npm run seed:demo`),
   and a link to the runbook.
2. Write `docs/deployment.md` (repo root `docs/`, not `.claude/skills/docs/`, since ops will read
   it without Claude) covering:
   - Prerequisites: Node version (match `@types/node`/what dev uses), PostgreSQL, the
     `ASSET_FILES_BASE_PATH` disk folder and its ACL for the service account.
   - Env vars: the full list from [[itam-conventions]], with production values
     (`NOTIFICATION_EMAIL_ENABLED` unset or `true`; `ITAM_APP_URL` = the public HTTPS URL, which
     also feeds QR labels and email links).
   - **HTTPS is required**: the session cookie is `secure` when `NODE_ENV=production`, so login
     silently fails over plain HTTP. Document the reverse proxy (e.g. IIS + URL Rewrite/ARR, or
     whatever ops uses) terminating TLS in front of `next start`. State that this is a choice for ops
     and the runbook only says what the app requires.
   - Build and run: `npm ci`, `npm run build`, `npm run start` (port), run as a Windows service
     (a service wrapper of ops' choice), restart on failure.
   - Database: fresh install = `schema.sql`; existing DB = apply `schema/migrations/NNN_*.sql` in
     order with `psql "$DATABASE_URL" -f`. **First move them (confirmed):** `git mv
     .claude/skills/schema schema` so `schema/schema.sql` and `schema/migrations/` sit at the
     repo root. Then update every reference: [[itam-conventions]] (folder tree), [[itam-schema-reference]],
     `skills/README.md` ("copy `schema/`" note and Supporting documents), each phase doc's
     `schema/...` mentions (they already say `schema/`, so check that relative wording still reads
     right), `lib/notifications/triggers.ts` or any code comment naming the old path, and the
     migration file's own header. Grep for `.claude/skills/schema` afterwards; it should match nothing.
   - First admin: `npm run seed:admin` (env vars or prompts); never commit credentials.
   - Scheduled notifications: point to `scripts/run-notifications-check.ps1`'s help block (don't
     duplicate it), plus the `CRON_SECRET` equality requirement.
   - Graph: Mail.Send is an **application** permission, so it can send as any mailbox unless
     restricted. Scope it to the sender mailbox with an Exchange application access policy.
   - Upgrades: backup DB + files folder, pull, `npm ci`, apply new migrations, build, restart.
   - **Post-deploy sign-off checklist** (formerly this phase's item 11): `/api/health` OK; login
     works over HTTPS; migration 001 present; one real `asset_assigned` email reaches a real inbox
     (Phase 7 left this unverified); `Start-ScheduledTask` once, `LastTaskResult` 0, an `OK` line
     in the log; record time/host/account in the ops notes.
3. Un-ignore the example env: add `!.env.example` after `.env*` in `.gitignore` and commit it.
   Confirm it holds placeholders only (Phase 2 once found a real password in it).
4. **D3 — scheduled-task retry**: make the retry real inside the script (e.g. up to 3 attempts,
   5 min apart, only for connection failures and 5xx; never retry 401/503 since those are config
   errors). This is safe because the endpoint is idempotent. Correct the help text's
   `-RestartCount` claim and keep the 10-minute `-ExecutionTimeLimit` above the total retry span.
   Static review only; don't run it.

## Checklist (sweep)

1. **Error boundaries** — Next 16.3 API (read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`
   first): error components are client components receiving `{ error, retry }`. Use `retry()`,
   not the older `reset()` (still present, but the docs prefer `retry`).
   - `app/(dashboard)/error.tsx`: renders inside `AppShell` (the layout above it isn't wrapped),
     reuses `StatusPage` (icon + title + copy + "Try again" → `retry()`, plus "Back to
     dashboard"). Show `error.digest` as a small reference code, never `error.message` (generic in
     production anyway, but don't rely on it).
   - `app/global-error.tsx`: owns `<html>`/`<body>`, imports `globals.css`, and applies the theme
     itself (it doesn't get the app's `ThemeProvider`). Reading the `next-themes` localStorage key
     or `prefers-color-scheme` is enough. Use React's `<title>`, since `metadata` isn't supported there.
   - Verify by temporarily throwing in a server component (revert after): the boundary shows, the
     sidebar stays usable, "Try again" recovers once the throw is removed.
2. **Permission-denied UX** — page level: `requireRole()` → `/403` (exists; verify as a viewer on
   `/settings/*`). API level: a 403 from a mutation surfaces as a toast/alert with the server's
   message, never silently. Spot-check one dialog as a viewer via a direct API call. After A,
   also verify a mid-session role downgrade lands correctly.
3. **Destructive confirmations** — move the consequence copy in the seven settings managers'
   delete/deactivate dialogs into `DialogDescription` (inside `DialogHeader`), matching
   [[itam-design-system]]'s dialog structure. Confirm dispose, soft delete, user deactivate and
   every lookup delete state the consequence explicitly. Zero Radix "Missing Description"
   console warnings afterwards.
4. **Dark/light audit** — every page in both themes, including `/login`, `/403`, both 404s, the
   new error boundary, the bell dropdown, `/notifications`, the label view, dialogs and
   `DatePicker`. No hardcoded colours outside tokens. Known, accepted exceptions: `AppLogo.tsx`'s
   brand hexes and the label page's `print:border-black`.
5. **Responsive audit** — 390px, 768px, 1000px (the `nav` breakpoint), and 1280px+ on every
   page: dashboard, assets list (with the new sort headers), asset detail tabs, create/edit form,
   label, reports, `/notifications`, all seven settings pages, login, 403/404/error. No horizontal
   page scroll, tables scroll inside their wrapper, dialogs full-screen below `sm`, touch targets
   ~44px.
6. **Empty states (confirm, don't rebuild)** — `EmptyState` already covers assets, all seven
   settings managers, attachments, maintenance, audit timeline, `/notifications`; dashboard
   widgets and the bell have inline empty copy. Verify each renders (filters that match nothing,
   a fresh asset with no attachments, etc.). Reports is a hub of cards, not a list, so it has no empty state.
7. **Loading states (confirm)** — every dashboard route has a `loading.tsx` skeleton; mutations
   pulse `RouteProgress`. Check none flashes the wrong skeleton (the reason the dashboard's lives
   in the `(overview)` group).
8. **Print** — `/assets/[id]/label` in browser print preview: no sidebar/topbar/footer/toaster,
   label sized to 3 in, QR scannable. Check light and dark (dark must still print black on white).
9. **Lint, health, small fixes**:
   - `npm run lint` with **zero** warnings. For `AssetQrCode.tsx`, drop the unused directive and
     keep a single, correctly-scoped `eslint-disable-next-line @next/next/no-img-element` with a
     one-line reason (`data:` URI, nothing for `next/image` to optimize).
   - `/api/health`: keep it as the ops health check (the runbook uses it) but return only
     `{ status, db }`, with no error message. Log the error server-side.
   - Default-status wording (owner-only, confirmed): fix `docs/asset-lifecycle-flow.md` rule 1
     and its diagram caption ("in_storage, or active if an owner is assigned"), and replace
     "flagged for confirmation" in Phase 4's doc with "confirmed in Phase 8".
10. **End-to-end smoke pass** (Playwright with temporary users, or the user's Chrome admin
    session; set `NOTIFICATION_EMAIL_ENABLED=false` for the run so nobody real gets mail, and
    restore `.env.local` byte-identical afterwards): walk `docs/asset-lifecycle-flow.md` once on
    one asset: create → assign to a temp user (their bell shows `asset_assigned`) → transfer
    location/department (`asset_transferred`) → condition change → status `in_repair` via a
    maintenance record → complete + restore prior status → dispose. The Audit Log timeline reads
    correctly end to end with names, not ids. The asset vanishes from active dashboard widgets
    and still appears (as disposed) in the register export. Then soft-delete a separate throwaway
    asset and confirm it 404s. Clean up: deactivate temp users, soft-delete test assets. Zero
    console errors throughout.

## Exit criteria

- A–C implemented and verified live as described in each item. D's documents exist, are
  accurate against the code, and `.env.example` is tracked with placeholders only.
- Checklist 1–10 checked against the running app, not just the code, in both themes and at the
  listed widths, with zero console errors/warnings attributable to the app.
- `tsc --noEmit` clean; `npm run lint` with zero errors **and zero warnings**; `npm run build`
  succeeds (the first production build of the project, so do this; it catches things `next dev`
  doesn't, e.g. `useSearchParams` without Suspense).
- Skill docs reconciled with reality (see Produces): no doc claims a feature that doesn't exist
  (sorting, `useMutation`), and every new file is listed in [[itam-conventions]]'s folder tree.
- Finally, run [[phase-completion-check]] against **this** phase's exit criteria as the MVP
  sign-off. There is no Phase 9 to do it on entry.

## Produces

- `app/(dashboard)/error.tsx`, `app/global-error.tsx`
- `lib/auth/session.ts` / `lib/auth/api.ts` — DB-backed session check (A)
- `lib/db/assets.ts` — sort whitelist + order-by builder; `AssetsList.tsx` sortable headers (B)
- `aria-invalid` styling in `components/ui/{Input,Select,DatePicker}.tsx`; per-field client
  checks in each form (C)
- `schema/schema.sql` + `schema/migrations/` at the repo root (moved from `.claude/skills/schema/`)
- `README.md` (rewritten), `docs/deployment.md`, `.gitignore` (`!.env.example`), tracked
  `.env.example`; `scripts/run-notifications-check.ps1` in-script retry + corrected help (D)
- Doc updates: [[itam-design-system]] (sorting = assets list only; mutation pattern =
  axios + `useRouteLoadingRouter().refresh()` + toast, `useMutation` where a client cache exists;
  error boundary pattern; `aria-invalid` field-error pattern), [[itam-conventions]] (folder tree:
  error files, `docs/deployment.md`; session revocation note), `docs/asset-lifecycle-flow.md`
  rule 1, `phase-4-asset-management` (default-status confirmation), `phase-7-notifications` (the
  retry correction), this file's "Confirmed as built"/"Verified" sections, and `skills/README.md`.

## Related skills

- [[itam-design-system]] — the standard this phase verifies against (and corrects where reality
  diverged on purpose)
- [[phase-completion-check]] — run on entry (against Phase 7) and on exit (against this phase)
- `docs/asset-lifecycle-flow.md` — the smoke-test script in Checklist 10 follows this state machine
- `phase-7-notifications` — the scheduled-task deploy steps moved into the runbook's sign-off list
