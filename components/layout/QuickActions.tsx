"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Boxes,
  FileBarChart,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { useSession } from "@/lib/auth/session-context";
import { settingsSections } from "@/components/layout/settings-sections";
import type { RoleName } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Navigates when set, otherwise `run` is called. */
  href?: string;
  run?: () => void;
  /** Omit to show to every role, matching the guards on the destination pages. */
  roles?: RoleName[];
  keywords?: string;
}

/** Keys that should keep typing a literal `/` instead of toggling the quick actions. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/** Desktop-only middle bar for the top bar. Clicking it (or pressing `/`) opens a modal of quick
 * actions that is anchored to, and as wide as, the bar itself so it reads as the bar expanding. */
export function QuickActions({ className }: { className?: string }) {
  const router = useRouteLoadingRouter();
  const session = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const barRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [rect, setRect] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const openModal = React.useCallback(() => {
    const el = barRef.current;
    // The bar is `display: none` below the md breakpoint, where the `/` shortcut must do nothing.
    if (!el || el.offsetParent === null) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width });
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      if (open) setOpen(false);
      else openModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openModal]);

  const actions = React.useMemo<QuickAction[]>(() => {
    const all: QuickAction[] = [
      {
        id: "new-asset",
        label: "New asset",
        icon: Plus,
        href: "/assets/new",
        roles: ["admin", "asset_manager"],
        keywords: "add create register",
      },
      {
        id: "assets",
        label: "All assets",
        icon: Boxes,
        href: "/assets",
        keywords: "list inventory",
      },
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        keywords: "home overview",
      },
      {
        id: "reports",
        label: "Reports",
        icon: FileBarChart,
        href: "/reports",
        keywords:
          "export excel xlsx download register audit trail disposal depreciation",
      },
      ...settingsSections.map(
        ({ label, href, description, icon }): QuickAction => ({
          id: href,
          label: `Settings: ${label}`,
          icon,
          href,
          roles: ["admin"],
          keywords: description,
        }),
      ),
      {
        id: "theme",
        label: "Toggle theme",
        icon: Moon,
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
        keywords: "dark light mode appearance",
      },
    ];
    return all.filter(
      (a) => !a.roles || (session && a.roles.includes(session.roleName)),
    );
  }, [session, resolvedTheme, setTheme]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      `${a.label} ${a.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [actions, query]);

  function choose(action: QuickAction) {
    setOpen(false);
    if (action.href) router.push(action.href);
    else action.run?.();
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (visible.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + visible.length) % visible.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = visible[activeIndex];
      if (action) choose(action);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <button
        ref={barRef}
        type="button"
        onClick={openModal}
        aria-label="Open quick actions"
        aria-keyshortcuts="/"
        className={cn(
          "border-border bg-muted/50 text-muted-foreground hover:bg-muted focus-visible:ring-ring hidden h-10 w-full max-w-md items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none md:flex",
          className,
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">
          Quick actions, press{" "}
          <kbd className="border-border bg-background rounded border px-1.5 font-mono text-sm">
            /
          </kbd>{" "}
          to toggle
        </span>
      </button>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={
            rect
              ? { top: rect.top, left: rect.left, width: rect.width }
              : undefined
          }
          className="bg-card text-card-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed z-50 flex max-h-[min(28rem,80dvh)] flex-col overflow-hidden rounded-xl border shadow-lg"
        >
          <DialogPrimitive.Title className="sr-only">
            Quick actions
          </DialogPrimitive.Title>
          <div className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground h-4 w-4 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search quick actions"
              aria-label="Search quick actions"
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <kbd className="border-border bg-background text-muted-foreground rounded border px-1.5 font-mono text-xs">
              Esc
            </kbd>
          </div>
          <div className="scroll-area-thin min-h-0 flex-1 overflow-y-auto p-1.5">
            {visible.length === 0 ? (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                No matching actions
              </p>
            ) : (
              <ul role="listbox" aria-label="Quick actions">
                {visible.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <li
                      key={action.id}
                      role="option"
                      aria-selected={i === activeIndex}
                    >
                      <button
                        type="button"
                        onClick={() => choose(action)}
                        onMouseMove={() => setActiveIndex(i)}
                        tabIndex={-1}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm",
                          i === activeIndex && "bg-muted",
                        )}
                      >
                        <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{action.label}</span>
                        {i === activeIndex && (
                          <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
