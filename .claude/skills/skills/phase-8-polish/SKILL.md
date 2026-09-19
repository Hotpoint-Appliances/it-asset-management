---
name: phase-8-polish
description: Phase 8 — final theming/responsive/accessibility pass, error boundaries, empty/loading states, and MVP QA sweep. Depends on all prior phases being functionally complete.
---

# Phase 8 — Polish & QA

Prerequisite skills: [[itam-design-system]]. Depends on phases 1–7 being functionally complete.

Before starting the Checklist below, run [[phase-completion-check]] against `phase-7-notifications`'s
exit criteria (the closest predecessor — phases 1–6 were each already gated on entry by their
own successor phase).

## Objective

Close the gap between "functionally complete" and "production-feel" before calling the MVP
done — this phase is a sweep, not new feature work.

## Checklist

1. **Dark/light mode audit** — every page/component checked in both themes; no hardcoded
   colors that broke the token system from [[itam-design-system]].
2. **Responsive audit** — every page (dashboard, asset list/detail, forms, settings/CRUD
   modules, reports) checked at mobile, tablet, and desktop widths against the breakpoint rules
   in [[itam-design-system]]. This phase catches what slipped through — responsiveness itself
   should already be built in from Phase 1 onward, not introduced here for the first time.
3. **Empty states** — every list view (assets, categories, locations, departments, vendors,
   users, notifications, reports) has a designed empty state, not a blank table.
4. **Loading states** — `Skeleton` components on every data-dependent view, no unstyled
   spinner-only screens.
5. **Error boundaries** — a root error boundary and per-route error handling
   (`error.tsx` in App Router) so a failed query shows a recoverable error UI, not a crash.
6. **Form validation feedback** — every form surfaces field-level errors clearly (per the
   accessibility baseline in [[itam-design-system]] — not color-only).
7. **Permission-denied UX** — confirm 403s (from Phase 2 RBAC) render a proper "not authorized"
   page, not a generic error or blank screen.
8. **Confirmation dialogs** — verify every destructive/terminal action (disposal, delete,
   deactivate user) has the explicit-consequence confirmation dialog required by
   [[itam-design-system]].
9. **Print stylesheets** — verify the Phase 4 QR/barcode label print view renders cleanly with
   browser print (no sidebar/topbar bleeding into the printed output).
10. **End-to-end smoke pass** — walk the full asset lifecycle once manually: create → assign →
    transfer (location/department/owner) → condition change → send to repair → return to
    active → dispose. Confirm the audit log timeline reads correctly at the end.

## Exit criteria

All items above checked off against the running app, not just the code. This phase produces no
new schema or major components — only fixes to what phases 1–7 built.

## Related skills

- [[itam-design-system]] — the standard this phase verifies compliance against
- `docs/asset-lifecycle-flow.md` — the smoke-test script in step 10 follows this state machine
