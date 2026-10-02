---
name: phase-completion-check
description: Verify the previous phase's exit criteria are actually met in the codebase before starting a new phase-N skill, and (for the last phase) verify the phase's own exit criteria as the MVP sign-off. Every phase-N skill (N > 1) references this and runs it first, before its own Steps/Checklist section.
---

# Phase Completion Check

Phases are executed in separate conversations/context windows (see `skills/README.md`'s load
order table). A `phase-N` skill cannot trust conversation history, or the prior phase's own
"Verified" section, to know whether `phase-(N-1)` actually finished. That context may be gone,
and a doc's claims can drift from the code. It must verify against the real codebase state
every time it's invoked.

This check has caught real defects that earlier writeups had marked as done. Phase 2 found a
stale `ASSET_FILES_BASE_PATH` and a real password in `.env.example`, and Phase 6 found six Phase 5
defects (D1–D6), including raw UUIDs in the audit timeline. Treat it as a real audit, not a formality.

## Procedure

1. **Identify the preceding phase.** For `phase-N`, that's `phase-(N-1)` (N > 1). Read its
   `SKILL.md` in full, specifically **Exit criteria**, **Produces**, **Decisions made** /
   **Confirmed as built**, and any **Not verified** or deploy-time notes. Also look for
   "Changed by Phase N-1" notes in earlier phase docs, where the predecessor changed an older
   phase's contracts (e.g. Phase 7 changed `updateAsset()`'s return type, noted in Phase 5).
2. **Verify each exit criterion against the actual repo/environment, not memory:**
   - Files/folders claimed as "Produces" → `Glob`/`Read` to confirm they exist and aren't stubs.
   - Static gates: `npx tsc --noEmit` and `npm run lint` (compare the warning count against
     what the predecessor recorded; a new warning is a finding).
   - Runtime behavior claimed → actually exercise it against the running dev server (check
     whether one is already running before starting another). Use `curl` for API status codes
     and auth (401/403/404), and a **real browser** for anything rendered. Phase 4 proved
     `curl`-only checks miss Server-Component crashes.
   - DB/schema state → query the live database (table/column/index exists, migration applied,
     seed rows present) rather than re-reading `schema/schema.sql`. Put throwaway scripts in the
     session scratchpad, never in the repo.
3. **If everything checks out**, say so briefly and proceed directly into `phase-N`'s own
   Steps/Checklist — do not re-ask the user to confirm what you just verified yourself.
4. **If something is missing or broken**, stop before starting new `phase-N` work. Report
   exactly which criteria failed and why. Ask the user whether to fix the gap now (as a
   preamble to this phase) or halt. Never build phase-N functionality on top of an unverified
   or broken foundation.
5. **Record the result in both docs** (the established pattern):
   - In `phase-N`'s `SKILL.md`: a short **"Preamble: Phase N-1 completion check"** section saying
     what was checked, how, and any defects found or fixed.
   - In `phase-(N-1)`'s `SKILL.md`: update its **Verified** section, or add a "Re-verified before
     Phase N" section listing defects and fixes. If phase N changes a contract phase N-1 produced,
     add a "Changed by Phase N" note there too.

## Browser verification

Two tools have been used. Pick whichever fits; both are acceptable evidence:

- **Claude in Chrome** with the user's signed-in admin session: quickest for admin-role page
  checks, console errors and a quick responsive look. Open your own tab, close it afterwards,
  never trigger `alert`/`confirm` dialogs, and don't change the user's data beyond what the check
  needs.
- **Playwright** (persisted devDependency, see [[itam-conventions]]): needed for multi-role checks
  (viewer/asset_manager), scripted assertions, and 390px runs. Create **temporary users** for the
  roles you need (or mint a session cookie with `jose` + `JWT_SECRET` for an existing user;
  after Phase 8's session revocation the user must exist and be active). Afterwards,
  **deactivate** them, since users are never hard-deleted. Soft-delete any test assets, and
  restore any data you moved (e.g. a warranty date shifted to test a window).

In both cases record the zero-console-error result explicitly. Several real bugs (a hydration
error, a silently swallowed 400) were visible only in the console.

## Side effects: what the check must not do without asking

- **Email**: dev databases contain real people's addresses. Set
  `NOTIFICATION_EMAIL_ENABLED=false` for any run that could trigger notifications, and restore
  `.env.local` byte-identical afterwards. Send a live email only with the user's explicit consent
  and to the address they name.
- **Ops scripts and scheduled tasks** (e.g. `scripts/run-notifications-check.ps1`): verify by
  **static review**. The file exists, its logic matches the route it calls (URL, auth header,
  response fields, exit codes), and its help/setup text is accurate. Don't run it or register a
  Task Scheduler task unless the user explicitly asks in that session. Hitting the protected
  route with **no/wrong** secret (expect 401) is fine, because it rejects before any logic runs.
- **Deploy-time items** a phase explicitly marks as ops/server work (migrations on other
  environments, Task Scheduler registration, HTTPS) are not blockers for the next phase. Verify
  the repo side only and carry them forward. As of Phase 8 they live in
  `docs/deployment.md`'s post-deploy sign-off list.
- **Migrations**: confirm they're applied to the dev DB; don't apply anything to a DB other than
  the one in `.env.local`.

## Troubleshooting notes

- A route that 500s with an **empty body** while `tsc`/lint are clean is usually a stale
  Turbopack dev cache after new exports were added. Restart the dev server (clear `.next/dev`)
  before assuming the code is wrong (Phase 5).
- Date fields off by one day → check the mapper uses `lib/db/dates.ts`'s `toDateOnlyString()`
  (Phase 4). Dev runs in `Africa/Nairobi`.

## The last phase

`phase-8-polish` has no successor to run this check on entry, so Phase 8 runs this procedure a
second time against **its own** exit criteria as the MVP sign-off, recording the result in its
own "Verified" section.

## Notes

- `phase-1-foundation` has no preceding phase, so this check is a no-op there. Its own skill
  file says so explicitly at the top.
- This is a verification pass, not a re-implementation of the prior phase. If gaps are found,
  fix only what's needed to satisfy the unmet criteria; don't redo work that already passed.
- Keep it proportionate. Read the specific files/tables named in the prior phase's exit
  criteria and don't re-audit the whole codebase, but do run the static gates and at least one
  live browser pass over the prior phase's UI.

## Related skills

- `skills/README.md` — phase load order and why phases run in separate context windows
- Every `skills/phase-2-*` through `skills/phase-8-*` file — each references this skill at the
  top of its own file
- [[itam-conventions]] — Playwright as a persisted devDependency; env vars incl.
  `NOTIFICATION_EMAIL_ENABLED`
