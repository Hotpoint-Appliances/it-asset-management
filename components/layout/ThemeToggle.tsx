"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/Tooltip";
import { isTypingTarget } from "@/lib/utils";

/** Theme toggle button, also bound to the `D` key app-wide (skipped while typing, with a
 * modifier held, or on key repeat so holding the key doesn't strobe the theme). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = React.useCallback(
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    [resolvedTheme, setTheme],
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "d") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          aria-keyshortcuts="D"
          onClick={toggle}
        >
          <Moon className="h-5 w-5 dark:hidden" />
          <Sun className="hidden h-5 w-5 dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        Toggle theme
        <kbd className="border-background/30 rounded border px-1.5 font-mono text-[11px] leading-4">
          D
        </kbd>
      </TooltipContent>
    </Tooltip>
  );
}
