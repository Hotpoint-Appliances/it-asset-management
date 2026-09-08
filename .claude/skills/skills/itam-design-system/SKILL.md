---
name: itam-design-system
description: Look-and-feel rules for the ITAM UI — shadcn/ui-style components, dark/light mode via next-themes, dashboard/table/modal patterns. Load before building any page or component.
---

# ITAM — Design System

Confirmed direction: **shadcn/ui style** — Radix UI primitives + Tailwind CSS, the current
standard pattern for admin/dashboard apps (Linear, Vercel, Retool aesthetic). Clean, minimal,
dense-table-friendly, generous but not wasteful whitespace.

## Component base

- Build `/components/ui` as shadcn-style primitives: `Button`, `Input`, `Select`, `Dialog`,
  `Table`, `Badge`, `DropdownMenu`, `Tabs`, `Tooltip`, `Card`, `Sheet` (slide-over panel),
  `Skeleton` (loading states), `Toast` (mutation feedback).
- Radix UI primitives underneath (`@radix-ui/react-*`) for accessibility (focus trap,
  keyboard nav, ARIA) — Tailwind for styling on top. This is the shadcn/ui pattern: copy
  component source in, don't pull a black-box component library.
- Icons: `lucide-react` exclusively — do not mix icon sets.

## Theming (dark/light via `next-themes`)

- Define color tokens as CSS variables in `globals.css` (`--background`, `--foreground`,
  `--muted`, `--border`, `--primary`, `--destructive`, etc.), each with a light and dark value.
  Tailwind config maps utility classes to these variables — never hardcode a hex color in a
  component.
- Wrap the app in `ThemeProvider` from `next-themes` at the root layout; default to `system`.
- Every status/condition badge needs both-theme-aware colors (e.g. `active` = green,
  `in_repair` = amber, `disposed` = neutral gray, `lost`/`stolen` = red) — define once as a
  shared badge-variant map, not per-component.

## Responsive design (build for every screen size, not retrofitted later)

The app must be built responsive from the start — not audited-in during polish. Use Tailwind's
default breakpoints (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px) as the
standard scale across every component and page:

- **Mobile-first CSS**: write unprefixed (base) styles for the smallest viewport, then layer
  `sm:`/`md:`/`lg:` overrides upward — never the reverse.
- **App shell**: sidebar collapses to an off-canvas `Sheet` (slide-over, per the primitive
  list above) below `md`, triggered by a hamburger icon in the topbar; persistent sidebar at
  `md` and above.
- **Data tables**: below `md`, either horizontally scroll within a contained `overflow-x-auto`
  wrapper (never let the page itself scroll horizontally) or switch to a stacked card-per-row
  layout for the asset list — pick one pattern and apply it consistently across every list view
  (assets, categories, locations, users, etc.), don't mix patterns per page.
- **Forms**: multi-column field layouts (e.g. the asset create/edit form) collapse to a single
  column below `md`.
- **Modals/dialogs**: full-screen on mobile widths, centered fixed-width dialog from `md` up.
- **Touch targets**: interactive elements (buttons, row actions, dropdown triggers) sized for
  touch (minimum ~44px hit target) wherever the layout may render on a tablet/touch device —
  this is a warehouse/storeroom-adjacent internal tool, tablet use is plausible, not
  hypothetical.
- Every component built in every phase from `phase-1-foundation` onward must be checked at
  mobile, tablet, and desktop widths as part of that phase's own exit criteria — `phase-8-polish`
  is a final sweep to catch what slipped through, not the first time responsiveness is
  considered.

## Layout patterns

- **App shell**: fixed sidebar (collapsible) + topbar (breadcrumbs, user menu, theme toggle,
  notification bell) + scrollable content area. Sidebar groups: Dashboard, Assets, Categories,
  Locations, Departments, Users (admin only), Reports, Settings.
- **List/table pages** (assets, users, etc.): data table with column sorting, filter bar above
  (status, category, department, location, condition as multi-select filters), search input,
  pagination footer, row-level actions via `DropdownMenu` (View, Edit, Transfer, Dispose).
- **Detail pages** (single asset): header card (tag, name, status/condition badges, image),
  tabbed sections — Overview, Audit Log (timeline), Attachments, Maintenance.
- **Create/edit forms**: use a `Dialog` (modal) for quick actions (transfer owner/location,
  change condition) and a full page for the asset create/edit form (too many fields for a
  modal). Confirm this split per-phase if a form grows beyond ~6 fields.
- **Destructive/terminal actions** (dispose, delete): always a confirmation `Dialog` with the
  consequence stated explicitly (e.g. "This will mark the asset as disposed and remove it from
  active reports").

## Feedback & state

- Mutations go through TanStack Query `useMutation` with optimistic or invalidate-on-success
  patterns; show a `Toast` on success/failure.
- Empty states: every list view needs a designed empty state (icon + short copy + primary
  action), not a blank table.
- Loading states: `Skeleton` components matching the shape of the content being loaded, not a
  spinner-only page.

## Accessibility baseline

- All interactive elements keyboard-navigable (Radix gives this by default — don't override
  focus handling).
- Color is never the only signal for status — pair badges with text labels, not color alone.
- Form errors announced via `aria-describedby`, not color-only.

## Related skills

- [[itam-conventions]] — folder structure `/components/ui` sits under
- `skills/phase-1-foundation` — where the design tokens and `ThemeProvider` get scaffolded
- `skills/phase-8-polish` — final theming/responsive/accessibility pass
