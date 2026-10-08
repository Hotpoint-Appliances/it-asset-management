"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/DropdownMenu";
import {
  LIST_SEARCH_THRESHOLD,
  ListSearchInput,
  applySearchKeystroke,
  isSearchKeystroke,
  matchesQuery,
} from "@/components/ui/ListSearch";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  /** Radix focuses the menu itself on open (DropdownMenuContent has no onOpenAutoFocus hook);
   * that first focus is redirected to the search box (see handleContentFocus). */
  const pendingSearchFocus = React.useRef(false);
  const searchable = options.length >= LIST_SEARCH_THRESHOLD;
  const visible = searchable
    ? options.filter((o) => matchesQuery(o.label, query))
    : options;

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  function handleContentFocus(e: React.FocusEvent) {
    if (!pendingSearchFocus.current || e.target === searchRef.current) return;
    pendingSearchFocus.current = false;
    searchRef.current?.focus({ preventScroll: true });
  }

  /** Hovering an item moves focus onto it (Radix behaviour), so typing while focus sits on an
   * item is sent back to the search box instead of Radix's typeahead. */
  function handleContentKeyDown(e: React.KeyboardEvent) {
    if (e.target === searchRef.current || !isSearchKeystroke(e)) return;
    e.preventDefault();
    setQuery((q) => applySearchKeystroke(q, e.key));
    searchRef.current?.focus({ preventScroll: true });
  }

  /** Keys typed in the search box stay there, except Escape (closes) and Arrow Down, which moves
   * focus to the first visible option (Radix only handles arrows from the menu itself). */
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      listRef.current
        ?.querySelector<HTMLElement>('[role="menuitemcheckbox"]')
        ?.focus();
    }
    if (e.key !== "Escape") e.stopPropagation();
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) return;
        setQuery("");
        pendingSearchFocus.current = searchable;
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {label}
          {selected.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="flex max-h-72 flex-col overflow-hidden p-0"
        onFocus={searchable ? handleContentFocus : undefined}
        onKeyDown={searchable ? handleContentKeyDown : undefined}
      >
        {/* Header sits outside the scrolling list so the label and search stay pinned. */}
        <div className="shrink-0 px-1 pt-1">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {searchable && (
            <div className="px-0.5 pb-1">
              <ListSearchInput
                ref={searchRef}
                value={query}
                onValueChange={setQuery}
                onKeyDown={handleSearchKeyDown}
                aria-label={`Search ${label.toLowerCase()}`}
              />
            </div>
          )}
          <DropdownMenuSeparator className="mb-0" />
        </div>
        <div
          ref={listRef}
          className="scroll-area-thin min-h-0 flex-1 overflow-y-auto p-1"
        >
          {options.length === 0 && (
            <p className="text-muted-foreground px-2 py-1.5 text-sm">
              No options
            </p>
          )}
          {options.length > 0 && visible.length === 0 && (
            <p className="text-muted-foreground px-2 py-3 text-center text-sm">
              No matches
            </p>
          )}
          {visible.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
              onSelect={(e) => e.preventDefault()}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
