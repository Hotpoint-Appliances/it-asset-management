"use client";

import { useRouter } from "next/navigation";
import { Menu, Boxes, Bell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";

export function Topbar({ className }: { className?: string }) {
  const router = useRouter();
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <header
      className={cn(
        "border-border bg-background/95 supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 flex h-16 items-center gap-2 border-b px-4",
        className,
      )}
    >
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            IT Asset Manager
          </SheetTitle>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Go back"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
