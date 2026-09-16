import { Suspense, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Footer } from "./Footer";
import { RouteProgress } from "./RouteProgress";
import { LogoutOverlay } from "./LogoutOverlay";

export function AppShell({
  children,
  sidebarCollapsed,
}: {
  children: ReactNode;
  sidebarCollapsed?: boolean;
}) {
  return (
    <div className="flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <LogoutOverlay />
      <Sidebar defaultCollapsed={sidebarCollapsed} className="print:hidden" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col print:min-h-0">
        <Topbar className="print:hidden" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain print:h-auto print:overflow-visible">
          <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip p-4 sm:p-6 print:max-w-none print:p-0">
            {children}
          </main>
          <Footer className="print:hidden" />
        </div>
      </div>
    </div>
  );
}
