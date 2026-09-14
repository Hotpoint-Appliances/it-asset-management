"use client";

import * as React from "react";
import axios from "axios";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";

/** Type-ahead search over `users`, per phase-4-asset-management Step 2 ("type-ahead search over
 * users for assigned_user_id, with free-text fallback"). Fetches the (already department/role
 * scoped, per lib/db/users.listUsers) user list once and filters client-side — the list is
 * small enough that a dedicated search endpoint isn't justified yet. */
export function UserTypeahead({
  value,
  displayName,
  onSelect,
}: {
  value: string | null;
  displayName: string | null;
  onSelect: (user: { id: string; fullName: string } | null) => void;
}) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    axios
      .get<{ users: User[] }>("/api/users")
      .then((res) => setUsers(res.data.users.filter((u) => u.isActive)))
      .catch(() => setUsers([]));
  }, []);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users
      .filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 20);
  }, [users, query]);

  if (value && displayName) {
    return (
      <div className="border-border bg-muted/50 flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5">
          <Check className="text-success h-4 w-4" />
          {displayName}
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center"
          aria-label="Clear selected user"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        placeholder="Search users by name or email…"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="bg-card border-border scroll-area-thin absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border p-1 shadow-md">
          {matches.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">No matching users</p>
          ) : (
            matches.map((u) => (
              <button
                type="button"
                key={u.id}
                onClick={() => {
                  onSelect({ id: u.id, fullName: u.fullName });
                  setQuery("");
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-11 w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm",
                  "hover:bg-muted",
                )}
              >
                <span className="font-medium">{u.fullName}</span>
                <span className="text-muted-foreground text-xs">{u.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
