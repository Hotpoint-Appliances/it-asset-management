"use client";

import * as React from "react";
import axios from "axios";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Portal } from "@/components/ui/Portal";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";

const PANEL_MAX_HEIGHT = 224;
const PANEL_GAP = 4;
/** Kept clear between the panel and the window edge. */
const PANEL_EDGE = 8;

/** Type-ahead search over `users`, per phase-4-asset-management Step 2 ("type-ahead search over
 * users for assigned_user_id, with free-text fallback"). Fetches the (already department/role
 * scoped, per lib/db/users.listUsers) user list once and filters client-side, the list is
 * small enough that a dedicated search endpoint isn't justified yet.
 *
 * Keyboard: focus stays in the input and the arrow keys move a highlight through the list (the
 * ARIA combobox pattern). Inside a dialog the panel sits outside the focus trap, so Tab could never
 * reach it. Enter picks the highlighted user, Escape closes only the list. */
export function UserTypeahead({
  value,
  displayName,
  onSelect,
  id,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  value: string | null;
  displayName: string | null;
  onSelect: (user: { id: string; fullName: string } | null) => void;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const clearRef = React.useRef<HTMLButtonElement>(null);
  const listId = React.useId();
  const [activeIndex, setActiveIndex] = React.useState(-1);
  // Picking or clearing swaps the input and the chip, which would drop focus out of the form.
  const pendingFocus = React.useRef<"input" | "clear" | null>(null);

  React.useEffect(() => {
    axios
      .get<{ users: User[] }>("/api/users")
      .then((res) => setUsers(res.data.users.filter((u) => u.isActive)))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, []);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(panelRef.current && panelRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const updatePosition = React.useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Below when the panel fits there, otherwise whichever side has more room; the list scrolls
    // inside whatever height that leaves.
    const spaceBelow =
      window.innerHeight - rect.bottom - PANEL_GAP - PANEL_EDGE;
    const spaceAbove = rect.top - PANEL_GAP - PANEL_EDGE;
    const below = spaceBelow >= PANEL_MAX_HEIGHT || spaceBelow >= spaceAbove;
    setPosition({
      top: below ? rect.bottom + PANEL_GAP : undefined,
      bottom: below ? undefined : window.innerHeight - rect.top + PANEL_GAP,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(PANEL_MAX_HEIGHT, below ? spaceBelow : spaceAbove),
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users
      .filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [users, query]);

  const optionId = (index: number) => `${listId}-option-${index}`;

  // Escape closes only the list, never a parent Radix Dialog (its Escape listener is on `document`
  // in the capture phase; `window` capture runs first).
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  const isSelected = Boolean(value && displayName);
  React.useEffect(() => {
    if (pendingFocus.current === "clear" && isSelected) {
      clearRef.current?.focus();
      pendingFocus.current = null;
    } else if (pendingFocus.current === "input" && !isSelected) {
      inputRef.current?.focus();
      pendingFocus.current = null;
    }
  }, [isSelected]);

  React.useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`${listId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  function selectUser(user: User) {
    pendingFocus.current = "clear";
    onSelect({ id: user.id, fullName: user.fullName });
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (matches.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) =>
        // From no highlight, Up lands on the last user rather than one before it.
        index < 0 && step < 0
          ? matches.length - 1
          : (index + step + matches.length) % matches.length,
      );
    } else if (e.key === "Enter" && open) {
      // With the list open, Enter belongs to the list and must not submit the form.
      e.preventDefault();
      const user = matches[activeIndex];
      if (user) selectUser(user);
    }
  }

  if (value && displayName) {
    return (
      <div className="border-border bg-muted/50 flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5">
          <Check className="text-success h-4 w-4" />
          {displayName}
        </span>
        <button
          ref={clearRef}
          type="button"
          onClick={() => {
            pendingFocus.current = "input";
            onSelect(null);
          }}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-6 w-6 items-center justify-center rounded focus-visible:ring-2 focus-visible:outline-none"
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
        ref={inputRef}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={query}
        placeholder="Search users by name or email…"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && position && (
        <Portal>
          <div
            ref={panelRef}
            // Portaled to <body>, which a modal sets to pointer-events: none, so the panel turns them
            // back on, and DialogContent reads data-dialog-safe so that a click here doesn't close it.
            data-dialog-safe
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="bg-card border-border pointer-events-auto fixed z-[60] flex flex-col overflow-clip rounded-lg border shadow-md"
          >
            <div className="scroll-area-thin min-h-0 flex-1 overflow-y-auto p-1">
              {loadingUsers ? (
                <div className="space-y-1 p-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-muted h-10 w-full animate-pulse rounded-md"
                    />
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <p className="text-muted-foreground px-3 py-2 text-sm">
                  No matching users
                </p>
              ) : (
                <div id={listId} role="listbox" aria-label="Users">
                  {matches.map((u, index) => (
                    <div
                      key={u.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      // Keeps focus in the input, which owns the keyboard handling.
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => selectUser(u)}
                      className={cn(
                        "flex min-h-11 w-full cursor-pointer flex-col items-start rounded-md px-2 py-1.5 text-left text-sm",
                        index === activeIndex && "bg-muted",
                      )}
                    >
                      <span className="font-medium">{u.fullName}</span>
                      <span className="text-muted-foreground text-xs">
                        {u.email}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
