import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "@/components/ui/Toast";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="print:hidden" />
      <div className="flex flex-1 flex-col">
        <Topbar className="print:hidden" />
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-4 sm:p-6 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
