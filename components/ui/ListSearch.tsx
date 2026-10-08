"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Option count at which a dropdown (Select, MultiSelectFilter) grows a sticky search box. Below
 * this the list is short enough to scan by eye and the extra field is just noise. */
export const LIST_SEARCH_THRESHOLD = 6;

/** Case-insensitive substring match; an empty/whitespace query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || text.toLowerCase().includes(q);
}

/** Plain text of a ReactNode label (strings, numbers, arrays, nested elements), used to match
 * option labels that arrive as JSX children rather than strings. */
export function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return "";
}

/** True for a keystroke that should be typed into the search box (printable character or
 * Backspace, no Ctrl/Alt/Meta), used to pull focus back from a hovered item to the box. */
export function isSearchKeystroke(e: React.KeyboardEvent): boolean {
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  return e.key.length === 1 || e.key === "Backspace";
}

/** Applies a redirected keystroke (see isSearchKeystroke) to the current query. */
export function applySearchKeystroke(query: string, key: string): string {
  return key === "Backspace" ? query.slice(0, -1) : query + key;
}

interface ListSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  "aria-label"?: string;
}

/** The search field pinned above a dropdown's scrolling list. */
export const ListSearchInput = React.forwardRef<
  HTMLInputElement,
  ListSearchInputProps
>(
  (
    {
      value,
      onValueChange,
      onKeyDown,
      placeholder = "Search…",
      "aria-label": ariaLabel = "Search options",
    },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current!);

    return (
      <div className="relative">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
        />
        <input
          ref={innerRef}
          type="text"
          role="searchbox"
          autoComplete="off"
          spellCheck={false}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            "border-border bg-background text-foreground h-9 w-full rounded-md border pr-8 pl-8 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          )}
        />
        {value !== "" && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear search"
            onClick={() => {
              onValueChange("");
              innerRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);
ListSearchInput.displayName = "ListSearchInput";
