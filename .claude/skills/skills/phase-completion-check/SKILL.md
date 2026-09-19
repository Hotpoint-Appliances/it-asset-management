---
name: phase-completion-check
description: Verify the previous phase's exit criteria are actually met in the codebase before starting a new phase-N skill. Every phase-N skill (N > 1) references this and runs it first, before its own Steps section.
---

# Phase Completion Check

Phases are executed in separate conversations/context windows (see `skills/README.md`'s load
order table). A `phase-N` skill cannot trust conversation history to know whether `phase-(N-1)`
actually finished — that context may have been cleared. It must verify against the real
codebase state every time it's invoked.

## Procedure

1. **Identify the preceding phase.** For `phase-N`, that's `phase-(N-1)` (N > 1). Read its
   `SKILL.md`, specifically the **Exit criteria** and **Produces** sections.
2. **Verify each exit criterion against the actual repo/environment, not memory:**
   - Files/folders claimed as "Produces" → `Glob`/`Read` to confirm they exist and aren't stubs.
   - Runtime behavior claimed (e.g. "app boots", "DB connection verified") → actually run it
     (`npm run dev`, hit the health route, query the DB) rather than assuming a past summary
     was accurate.
   - DB/schema state → query the live database (table exists, seed rows present) rather than
     re-reading `schema/schema.sql` and assuming it was applied.
3. **If everything checks out**, say so briefly and proceed directly into `phase-N`'s own Steps
   section — do not re-ask the user to confirm what you just verified yourself.
4. **If something is missing or broken**, stop before starting new `phase-N` work. Report
   exactly which criteria failed and why. Ask the user whether to fix the gap now (as a
   preamble to this phase) or halt. Never build phase-N functionality on top of an unverified
   or broken foundation — later phases assume earlier "Produces" artifacts are real and correct.

## Notes

- `phase-1-foundation` has no preceding phase, so this check is a no-op there — its own skill
  file says so explicitly at the top.
- This is a verification pass, not a re-implementation of the prior phase. If gaps are found,
  fix only what's needed to satisfy the unmet criteria; don't redo work that already passed.
- Keep this check fast: read the specific files/tables named in the prior phase's exit
  criteria, don't re-audit the whole codebase.

## Related skills

- `skills/README.md` — phase load order and why phases run in separate context windows
- Every `skills/phase-2-*` through `skills/phase-8-*` file — each references this skill at the
  top of its own file
