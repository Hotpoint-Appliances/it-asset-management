import { Suspense, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Footer } from "./Footer";
import { RouteProgress } from "./RouteProgress";
import { LogoutOverlay } from "./LogoutOverlay";
import { ShellScrollArea } from "./ShellScrollArea";

export function AppShell({
  children,
  sidebarCollapsed,
}: {
  children: ReactNode;
  sidebarCollapsed?: boolean;
}) {
  return (
    <div className="nav:bg-canvas flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible print:bg-transparent">
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <LogoutOverlay />
      <Sidebar defaultCollapsed={sidebarCollapsed} className="print:hidden" />
      {/* Inset content panel from `nav` up: rounded, offset from the canvas on top/right/bottom,
          clipping the scroll area to its corners. Full-bleed below `nav` (drawer mode). */}
      <div className="nav:my-2 nav:mr-2 nav:overflow-hidden nav:rounded-xl nav:border nav:border-border nav:bg-background nav:shadow-sm flex min-h-0 min-w-0 flex-1 flex-col print:m-0 print:min-h-0 print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        <Topbar defaultCollapsed={sidebarCollapsed} className="print:hidden" />
        <ShellScrollArea className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain print:h-auto print:overflow-visible">
          <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip p-4 sm:p-6 print:max-w-none print:p-0">
            {children}
          </main>
          <Footer className="print:hidden" />
        </ShellScrollArea>
      </div>
    </div>
  );
}
