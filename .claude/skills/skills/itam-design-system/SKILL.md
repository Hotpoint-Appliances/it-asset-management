---
name: itam-design-system
description: Look-and-feel rules for the ITAM UI — shadcn/ui-style components, dark/light mode via next-themes, dashboard/table/modal patterns. Load before building any page or component.
---

# ITAM — Design System

Confirmed direction: **refined shadcn/ui style** — Radix UI primitives + Tailwind CSS, the
current standard pattern for admin/dashboard apps (Linear, Vercel, Retool aesthetic), tuned up
from stock shadcn defaults: a dedicated accent color, a slightly larger radius scale, and
layered shadows instead of flat ones. Clean, minimal, dense-table-friendly, generous but not
wasteful whitespace — "refined" means more crafted, not maximalist; don't add gradients,
decorative borders, or texture beyond what's specified below.

## Component base

- Build `/components/ui` as shadcn-style primitives: `Button`, `Input`, `Select` (custom Radix
  combobox — see below, never a native `<select>`), `Dialog`, `Table`, `Badge`, `DropdownMenu`,
  `Tabs`, `Tooltip`, `Card`, `Sheet` (slide-over panel), `Skeleton` (loading states), `Toast`
  (mutation feedback).
- Radix UI primitives underneath (`@radix-ui/react-*`) for accessibility (focus trap,
  keyboard nav, ARIA) — Tailwind for styling on top. This is the shadcn/ui pattern: copy
  component source in, don't pull a black-box component library.
- `Select` (`components/ui/Select.tsx`) wraps `@radix-ui/react-select` but keeps a
  native-`<select>`-shaped API (`value`, `onChange` receiving `{ target: { value } }`, `<option>`
  children) so every call site reads exactly like a native select — never render a raw
  `<select>` element or hand-roll another dropdown; use this component (directly, or via
  `TreePicker` for hierarchical category/location pickers). A disabled `<option value="" disabled>`
  becomes the trigger's placeholder text (not a selectable item); a non-disabled
  `<option value="">` (e.g. "None") stays a real selectable option internally mapped off Radix's
  empty-string restriction — don't invent a second convention for "clear" options.
- `Tooltip` (`components/ui/Tooltip.tsx`, Radix-based) is mounted app-wide via `TooltipProvider`
  in `components/providers.tsx`. Required on any icon-only control whose label is hidden
  (collapsed sidebar nav items, icon buttons without visible text).
- Icons: `lucide-react` exclusively — do not mix icon sets.

## Visual language (radius, shadow, accent)

- **Radius scale** is driven by one CSS variable, `--radius: 0.625rem`, set in `:root`
  (`app/globals.css`) and expanded in `@theme inline` into `--radius-sm/md/lg/xl`
  (`calc(var(--radius) - 4px)` / `- 2px` / `var(--radius)` / `+ 4px`) — so `rounded-sm/md/lg/xl`
  utilities all derive from the one token. Don't hardcode a `rounded-[Npx]` value; pick the
  matching utility instead:
  - `rounded-lg` (10px): buttons, inputs, the Select trigger, dropdown/select menu panels, table
    wrapper, bordered list-item rows, image thumbnails — anything at "control" or "row" scale.
  - `rounded-md` (8px): small icon-only controls nested inside a larger rounded-lg surface
    (dialog/sheet close buttons, menu items, small `sm`-size buttons) — one step down from
    their container so corners don't visually compete.
  - `rounded-xl` (14px): `Card`, `Dialog`/`Sheet` content, `Toast` — the outermost "surface"
    elevation level.
  - `rounded-full`: badges and avatars only.
  - `Sheet` and `Tabs` stay unrounded by design (edge-attached slide-over / underline tabs).
- **Shadows**: Tailwind's stock scale is fine as-is — `shadow-xs` on buttons/inputs,
  `shadow-sm` on cards/table wrapper, `shadow-md` on dropdown/select content, `shadow-lg` on
  dialog/sheet/toast. Don't invent custom shadow values; heavier elevation = higher on this list,
  never a bespoke box-shadow string.
- **Accent**: `--primary` is the app's one accent color (indigo — light `#4f46e5` on white
  foreground, dark `#818cf8` on a near-black foreground), used for primary buttons, active
  sidebar nav item (`bg-primary/10 text-primary`), links, and focus/selection states. It replaced
  the earlier neutral black/white primary — everything else (`--secondary`, `--muted`,
  `--border`, `--success`, `--warning`, `--destructive`) stays the existing neutral/semantic
  scale. Don't introduce a second accent hue; tint the existing one with opacity
  (`bg-primary/10`, `/90` on hover) rather than picking a new color.

## Theming (dark/light via `next-themes`)

- Define color tokens as CSS variables in `globals.css` (`--background`, `--foreground`,
  `--muted`, `--border`, `--primary`, `--destructive`, etc.), each with a light and dark value.
  Tailwind's `@theme inline` block maps utility classes to these variables — never hardcode a hex
  color in a component.
- Wrap the app in `ThemeProvider` from `next-themes` at the root layout; default to `system`.
- Every status/condition badge needs both-theme-aware colors (e.g. `active` = green,
  `in_repair` = amber, `disposed` = neutral gray, `lost`/`stolen` = red) — define once as a
  shared badge-variant map, not per-component.

## Scrollbars

- Every scrollable element gets a transparent-track scrollbar via one of two utility classes
  defined in `app/globals.css`: `.scroll-area` (default width, ~10px thumb) for page-level /
  modal / layout-wrapper scrolling (`main` content area, `Dialog`/`Sheet` content, the `Table`
  wrapper), and `.scroll-area-thin` (~6px thumb) for dropdown/select/popover content (
  `DropdownMenuContent`, the `Select` viewport, `TreePicker`, `UserTypeahead`'s results panel,
  the collapsed sidebar's nav list). Never leave a scrollable container with the bare browser
  default — pick whichever of the two matches its role.
- `.scroll-area` also sets `scrollbar-gutter: stable`. This is the fix for Radix's scroll-lock
  layout shift (opening a modal `Dialog`/`Select`/`DropdownMenu` used to hide the page's
  scrollbar and nudge content sideways by the scrollbar's width for as long as it was open) —
  the gutter is reserved up front so locking `overflow` never changes the available width. If a
  new scrollable region is added anywhere the page itself might scroll behind an overlay, give
  it `.scroll-area` (or `scrollbar-gutter: stable` directly) rather than reintroducing the shift.

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

- **App shell** (`components/layout/AppShell.tsx`): `Sidebar` + a right column of `Topbar` +
  `main` + `Footer`, in one `flex` row. The sidebar is stationary while the page scrolls — it's
  `sticky top-0 h-screen` inside that flex row (not `position: fixed` — sticky-in-a-flex-row
  pins it to the viewport for the page's full scroll range without needing a manual margin/padding
  offset on the content column, which `fixed` would require). It's desktop-only (`hidden
  md:flex`); below `md` the mobile `Sheet` drawer (triggered from `Topbar`) is the nav, unchanged
  by any of this.
  - **Collapse-to-icons**: `sidebarCollapsed` lives in the zustand `useUIStore`
    (`store/index.ts`), persisted to `localStorage` via zustand's `persist` middleware
    (partialized to just that one field — don't persist `mobileNavOpen` or `toasts`). Toggled by
    a chevron button pinned at the bottom of the sidebar (`ChevronsLeft` expanded / `ChevronsRight`
    collapsed). Collapsed width is `76px` (icon + padding, meets the 44px touch-target rule with
    room either side); expanded is the existing `16rem`/`w-64`. `SidebarNav` takes a `collapsed`
    prop — collapsed nav items are icon-only, centered, and each wrapped in a `Tooltip` (`side="right"`)
    carrying the label, since the text disappears. Because this reads client state, `Sidebar` and
    `SidebarNav` are client components.
  - **Topbar** (`components/layout/Topbar.tsx`) carries, left to right: mobile hamburger
    (`md:hidden`, opens the Sheet drawer), a `router.back()` button (always visible, every page —
    this is the app's only back-navigation affordance, don't add a second one per-page unless a
    flow genuinely needs breadcrumbs instead), then notifications bell / theme toggle / user menu
    on the right.
  - **Footer** (`components/layout/Footer.tsx`) is shared between the dashboard shell and the
    login page — a single thin bar (`© year IT Asset Manager — Internal Tool` / version), not
    fixed to the viewport; it scrolls with content and sits after `main` in the DOM so it lands at
    the true bottom of the page. Reuse this component rather than duplicating footer markup if a
    third standalone layout (e.g. a future print/report view) needs one.
  - Sidebar groups: Dashboard, Assets, Reports, Settings (admin-only), driven by
    `components/layout/nav-items.ts`.
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
