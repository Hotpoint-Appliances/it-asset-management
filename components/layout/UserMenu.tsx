"use client";

import axios from "axios";
import { LogOut, UserCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/auth/session-context";
import { useUIStore } from "@/store";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  asset_manager: "Asset Manager",
  viewer: "Viewer",
};

export function UserMenu() {
  const session = useSession();
  const loggingOut = useUIStore((s) => s.loggingOut);
  const setLoggingOut = useUIStore((s) => s.setLoggingOut);
  const addToast = useUIStore((s) => s.addToast);

  if (!session) return null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await axios.post("/api/auth/logout");
      // Full reload (not next/navigation) so every client-only React and store state resets —
      // matches the login flow's own full reload. `replace`, not `assign`, so Back can't land on
      // a stale authenticated page.
      window.location.replace("/login");
    } catch {
      setLoggingOut(false);
      addToast({
        title: "Could not sign out",
        description: "Something went wrong. Please try again.",
        variant: "error",
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="User menu">
          <UserCircle2 className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{session.fullName}</span>
            <span className="text-muted-foreground text-xs">
              {ROLE_LABELS[session.roleName] ?? session.roleName}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} disabled={loggingOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
