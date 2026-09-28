"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** The app shell's scroll container (the page scrolls here, not the window). Next only scrolls
 * to a new page when its top is out of view, so without this a route change keeps the previous
 * page's offset and can land mid-page. Resets on pathname changes only: search-param updates
 * (filters, tabs, pagination) keep their position. */
export function ShellScrollArea({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Layout effect so the reset lands before paint, no flash of the old offset.
  React.useLayoutEffect(() => {
    ref.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
