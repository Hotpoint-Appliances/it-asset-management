import { useId } from "react";
import { cn } from "@/lib/utils";

/** The app mark: an indigo tile with an isometric asset box, drawn to match `app/icon.svg`
 * (the favicon) so the tab icon and the in-app logo read as one. Size it with `className`
 * (e.g. `h-7 w-7`). Decorative by default, since it sits beside the "IT Asset Manager" name. */
export function AppLogo({ className }: { className?: string }) {
  // Per-instance gradient id: a shared id breaks when the first instance is display:none
  // (the desktop sidebar on mobile), because the other logos reference its gradient.
  const gradientId = `app-logo-${useId()}`;

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-7 w-7 shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        fill="none"
        stroke="#a5b4fc"
        strokeOpacity="0.45"
      />
      <path d="M16 6.5 24.5 11 16 15.5 7.5 11Z" fill="#ffffff" />
      <path d="M7.5 11 16 15.5V25.5L7.5 21Z" fill="#e0e7ff" />
      <path d="M16 15.5 24.5 11V21L16 25.5Z" fill="#a5b4fc" />
    </svg>
  );
}
