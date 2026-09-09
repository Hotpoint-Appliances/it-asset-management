"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  asset_manager: "Asset Manager",
  viewer: "Viewer",
};

export function UserMenu() {
  const session = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  if (!session) return null;

  async function handleLogout() {
    setSigningOut(true);
    try {
      await axios.post("/api/auth/logout");
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
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
        <DropdownMenuItem onSelect={handleLogout} disabled={signingOut}>
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
