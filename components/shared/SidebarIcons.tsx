import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Sidebar toggle icons. A rounded window with a left rail, plus a chevron that
 * points the way the click will move the rail: left to collapse it, right to
 * expand it. The rail is tinted while the sidebar is open, so the icon shows
 * the current state as well as the action. Stroked on a 24px grid at width 1.5
 * with round caps, matching the Phosphor regular icons used elsewhere, and drawn in
 * `currentColor` so they follow the surrounding text colour token in light and
 * dark mode. Size them with `className`. Decorative, since the toggle button
 * carries the aria-label. */

type IconProps = { className?: string };

function SidebarFrame({
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-4.5! w-4.5! shrink-0", className)}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M9 3v18" />
      {children}
    </svg>
  );
}

/** Shown while the sidebar is collapsed: hollow rail, chevron pointing right (expand). */
export function SidebarCollapsedIcon({ className }: IconProps) {
  return (
    <SidebarFrame className={className}>
      <path d="m13.5 9 3 3-3 3" />
    </SidebarFrame>
  );
}

/** Shown while the sidebar is expanded: tinted rail, chevron pointing left (collapse). */
export function SidebarExpandedIcon({ className }: IconProps) {
  return (
    <SidebarFrame className={className}>
      <path
        d="M3 7a4 4 0 0 1 4-4h2v18H7a4 4 0 0 1-4-4Z"
        fill="currentColor"
        fillOpacity={0.25}
        stroke="none"
      />
      <path d="m16.5 9-3 3 3 3" />
    </SidebarFrame>
  );
}
