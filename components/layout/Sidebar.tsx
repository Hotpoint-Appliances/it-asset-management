import { Boxes } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { cn } from "@/lib/utils";

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "md:border-border md:bg-sidebar md:text-sidebar-foreground hidden md:flex md:w-64 md:flex-col md:border-r",
        className,
      )}
    >
      <div className="border-border flex h-16 items-center gap-2 border-b px-4">
        <Boxes className="h-5 w-5" />
        <span className="text-sm font-semibold">IT Asset Manager</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
