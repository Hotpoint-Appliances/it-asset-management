@AGENTS.md

## Working on proposed changes (`.claude/skills/CHANGES.md`)

Proposed bug fixes and UI/UX changes are written up in `.claude/skills/CHANGES.md`. Each time you pick that file up:

- **Clarify first.** If anything in a proposal is ambiguous, ask before you implement. Put every open question in one round of multiple-choice questions, with a recommended option where you have one.
- **Critique and recommend.** Say so if a proposal has trade-offs, edge cases (mobile, dark mode, accessibility) or a better alternative, and point out related bugs you notice along the way.
- **Phase the work.** Split larger changes into phases. Verify each phase before you commit it, and use one focused commit per change.
- **Verify in the running app.** A signed-in dev server is usually running at `localhost:3000` in Chrome, so check there first. If none is running, start one (`npm run dev`). If you're blocked (e.g. a sign-in is needed, or the browser can't reach the server), ask the user to step in rather than skipping verification.
