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
- `Dialog`, `Sheet`, `DropdownMenu`, `Select`, and `Tooltip` already render into
  `document.body` via Radix's own `Portal` primitive — don't wrap their content in anything
  else. `components/ui/Portal.tsx` (a plain mount-guarded `createPortal`) exists only for
  hand-rolled, non-Radix overlays that would otherwise be clipped by an `overflow-hidden`/
  `overflow-auto` ancestor or need to render above the app shell — e.g. `Toaster`, the
  logout overlay, and `UserTypeahead`'s results panel (which is manually positioned with
  `getBoundingClientRect()` since it isn't Radix-based).

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
- The dashboard shell (`AppShell`) scrolls internally (see App shell below), so the document
  itself never scrolls behind an open `Dialog`/`Select`/`DropdownMenu` there — Radix's scroll
  lock (`body[data-scroll-locked]`) has nothing to shift. Do **not** reach for
  `scrollbar-gutter: stable` or `html { overflow-y: scroll }` to defend against that shift again;
  those were a workaround for a `position: sticky` app shell (see below) and caused their own bugs
  (a permanently visible dead scrollbar strip on short pages like `/login`). Only pages that
  genuinely scroll the document (`/login`, `/403`, the 404 page) rely on the browser's native
  scrollbar, styled via the plain `html::-webkit-scrollbar*` rules in `globals.css`.

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
  an internally-scrolling wrapper (`.scroll-area overflow-y-auto`) around `main` + `Footer`, in
  one `flex h-dvh overflow-hidden` row — the document itself never scrolls in the dashboard.
  This used to be a `position: sticky` sidebar inside a document-scrolling shell, but any Radix
  overlay (`Dialog`/`Select`/`DropdownMenu`) locks scroll on `body`, which changes the sidebar's
  nearest scrollport ancestor and made `sticky` fall back to its static position — visibly
  yanking the sidebar and topbar upward by the current scroll offset the moment a dropdown opened.
  Making the shell itself the fixed-height scroll boundary (rather than the document) sidesteps
  that entirely: `body` locking to `overflow: hidden` is a no-op when it was never the scroll
  container. Don't reintroduce document-level scrolling in the dashboard, and don't swap the
  sidebar to `position: fixed` either — that only fixes the sidebar, still requires manually
  syncing a content-column margin/padding to the collapsed/expanded width, and does nothing for
  the same shift on any other in-flow element. It's desktop-only (`hidden md:flex`); below `md`
  the mobile `Sheet` drawer (triggered from `Topbar`) is the nav, unchanged by any of this.
  Non-dashboard document-scrolling pages (`/login`, `/403`, the 404 page) are unaffected and keep
  the browser's native scrollbar.
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
- **Dialog structure**: `DialogContent` itself never scrolls (`overflow-hidden p-0`) — it's a
  fixed three-region column of `DialogHeader` (bordered `border-b`, holds the title and, for
  destructive dialogs, a `DialogDescription`), `DialogBody` (the one scrollable region —
  `scroll-area overflow-y-auto`, holds the fields/content), and `DialogFooter` (bordered
  `border-t`, holds the action buttons). This keeps the title, close button, and action buttons
  pinned in place while a long dialog's content scrolls between them — the close button in
  particular used to scroll away with the content since `DialogContent` was the scroll container.
  A form dialog wraps `DialogBody` + `DialogFooter` in `<form className="flex min-h-0 flex-1
flex-col">` (not the whole `DialogContent`) so the footer's buttons stay outside the scrolling
  region while remaining part of the submit. Every dialog in the app follows this shape — don't
  reintroduce a directly-scrolling `DialogContent`.

## Feedback & state

- Mutations go through TanStack Query `useMutation` with optimistic or invalidate-on-success
  patterns; show a `Toast` on success/failure.
- Empty states: every list view needs a designed empty state (icon + short copy + primary
  action), not a blank table.
- Loading states: two tools for two different delays — a route segment's own data fetch (a fresh
  navigation to `/assets`, `/assets/[id]`, etc.) gets a sibling `loading.tsx` rendering a
  shape-matched skeleton from `components/skeletons/` (`TableSkeleton`, `FormSkeleton`,
  `DetailSkeleton`, `PageHeaderSkeleton`), which Next.js shows automatically — no call-site
  wiring needed. Anything that re-fetches an _already-mounted_ segment (a `router.refresh()`
  after a mutation, or a `router.push` that only changes search params, e.g. `AssetsList`'s
  filters/pagination) doesn't get that boundary, since the segment never unmounts — use
  `useRouteLoadingRouter` (`lib/hooks/useRouteLoadingRouter.ts`, a drop-in `useRouter()`
  replacement) instead, which pulses the top-level `RouteProgress` bar (mounted in `AppShell`)
  for exactly as long as the refresh/navigation takes. A `<Link>` also gets this treatment by
  rendering `LinkProgress` (`components/layout/LinkProgress.tsx`, wraps `useLinkStatus`) as one
  of its children. Client-side fetches inside a component (not a route navigation) get their own
  local `animate-pulse` skeleton state instead (see `UserTypeahead`'s results panel) — never a
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
