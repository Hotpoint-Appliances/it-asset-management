import type { ReactNode } from "react";

/** Full-screen, centered frame for pages outside the dashboard shell (403, signed-out 404, error
 * boundaries). `html` never scrolls (see globals.css), so the page scrolls inside this container,
 * with the public pages' native scrollbar (`.scroll-native`), when its content is taller than the
 * viewport, e.g. a phone in landscape. */
export function StandalonePage({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-native h-dvh overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
