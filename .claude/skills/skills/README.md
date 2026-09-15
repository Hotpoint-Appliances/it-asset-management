# ITAM Skill Files — Index & Execution Order

Not a skill itself — a map of how the skills in this directory fit together. Copy this whole
`skills/` directory (plus `schema/` and `docs/`) into the target project's `.claude/skills/`
when development starts.

## Load order

1. **Base skills** (load once, apply throughout):
   - `itam-conventions` — stack, folder structure, naming, env vars
   - `itam-schema-reference` — schema design decisions (companion to `schema/schema.sql`)
   - `itam-design-system` — shadcn/ui-style look and feel, dark/light mode
   - `phase-completion-check` — generic procedure every `phase-N` (N > 1) skill runs first, to
     verify the prior phase's exit criteria are actually met before starting new work. Exists
     because each phase is typically executed in its own conversation/context window (see
     "Model routing" below) — a fresh context can't trust its own memory of what a prior phase
     completed.

2. **Phases** (execute in order — each depends on the previous, and each runs
   `phase-completion-check` against its predecessor before starting its own Steps):

   | Phase | Skill                         | Delivers                                                                          |
   | ----- | ----------------------------- | --------------------------------------------------------------------------------- |
   | 1     | `phase-1-foundation`          | Scaffold, dependencies, DB connection, schema applied, themed app shell           |
   | 2     | `phase-2-auth`                | JWT sessions, RBAC (admin / asset_manager / viewer)                               |
   | 3     | `phase-3-core-data`           | CRUD for categories, locations, departments, vendors, conditions, statuses, users |
   | 4     | `phase-4-asset-management`    | Asset CRUD, image upload, QR code labels                                          |
   | 5     | `phase-5-asset-lifecycle`     | Transfers, condition/status changes, maintenance, disposal, audit timeline        |
   | 6     | `phase-6-dashboard-reporting` | Dashboard widgets, exceljs exports                                                |
   | 7     | `phase-7-notifications`       | MSAL/Graph email, in-app notifications                                            |
   | 8     | `phase-8-polish`              | Theming/responsive/a11y sweep, QA smoke pass                                      |

## Model routing

Per project guidelines: use a higher-effort/reasoning model (Opus) for planning and
exploration — deciding how a phase should be approached when a skill file leaves room for
judgment — and a faster execution model (Sonnet) to carry out an already-planned phase. Each
phase skill above is written to be self-contained enough to execute directly; reach for
Opus-level planning when a phase's steps conflict with something discovered in the actual
codebase, not as the default for every phase.

## Supporting documents (not skills, referenced by skills above)

- `schema/schema.sql` — source-of-truth DDL
- `docs/asset-lifecycle-flow.md` — asset state machine and transition rules
