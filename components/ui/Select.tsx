"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LIST_SEARCH_THRESHOLD,
  ListSearchInput,
  applySearchKeystroke,
  isSearchKeystroke,
  matchesQuery,
  nodeText,
} from "@/components/ui/ListSearch";

/** Sentinel Radix item value standing in for a real, selectable `<option value="">`. Radix
 * forbids an empty-string item value outright, so a selectable "None"/"top level" option
 * (as opposed to a disabled placeholder option, which never becomes an item at all; see
 * parseOptions) is rendered with this value and translated back to "" at the value/onChange
 * boundary. */
const EMPTY_VALUE = "__select-empty__";

interface ParsedOption {
  rawValue: string;
  label: React.ReactNode;
  disabled: boolean;
  /** Text the search box matches against and, while searching, shows in place of `label`
   * (from the option's `data-search-label`, e.g. a tree item's full "Parent › Child" path).
   * Null falls back to the label's plain text. */
  searchLabel: string | null;
}

function parseOptions(children: React.ReactNode): ParsedOption[] {
  const options: ParsedOption[] = [];
  React.Children.forEach(children, (child) => {
    if (
      !React.isValidElement<{
        value?: unknown;
        disabled?: boolean;
        children?: React.ReactNode;
        "data-search-label"?: string;
      }>(child)
    ) {
      return;
    }
    options.push({
      rawValue: child.props.value == null ? "" : String(child.props.value),
      label: child.props.children,
      disabled: !!child.props.disabled,
      searchLabel: child.props["data-search-label"] ?? null,
    });
  });
  return options;
}

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value" | "defaultValue"
> {
  value?: string | number | null;
  defaultValue?: string | number | null;
  onChange?: (e: { target: { value: string } }) => void;
  placeholder?: string;
  onOpenChange?: (open: boolean) => void;
  /** Pins the menu to this side of the trigger, never flipping on collision (e.g. "top" for a
   * control sitting at the bottom of the page). Omitted, it opens below and flips if cramped. */
  side?: "top" | "bottom";
  /** Sticky search box above the list. Defaults to on once there are LIST_SEARCH_THRESHOLD or
   * more real options; pass `false` for short fixed lists that are scanned, not searched (e.g.
   * the DatePicker's month/year menus). */
  searchable?: boolean;
}

/** Drop-in replacement for a native `<select>`: same `value`/`onChange`/`<option>` children API
 * (see parseOptions), rendered as a Radix Select so it gets consistent cross-browser styling,
 * keyboard nav, and the app's scrollbar treatment. A disabled `<option value="" disabled>` is
 * treated as a pure placeholder (never rendered as an item); a non-disabled `<option value="">`
 * is a real selectable "clear" option (see EMPTY_VALUE). With enough options it also grows a
 * sticky search box (see `searchable`): non-matching items are hidden and disabled rather than
 * unmounted, so the selected item's ItemText keeps feeding the trigger's displayed value. */
const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      children,
      value,
      defaultValue,
      onChange,
      disabled,
      required,
      id,
      name,
      placeholder,
      onOpenChange,
      side,
      searchable: searchableProp,
      "aria-label": ariaLabel,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedBy,
    },
    ref,
  ) => {
    const options = React.useMemo(() => parseOptions(children), [children]);
    const placeholderOption = options.find(
      (o) => o.rawValue === "" && o.disabled,
    );
    const items = options.filter((o) => o !== placeholderOption);
    const searchable =
      searchableProp ??
      items.filter((o) => o.rawValue !== "").length >= LIST_SEARCH_THRESHOLD;

    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const searchRef = React.useRef<HTMLInputElement>(null);
    /** Radix focuses the selected item (or the content) once the menu is positioned; the first
     * such focus after opening is redirected to the search box (see handleContentFocus). */
    const pendingSearchFocus = React.useRef(false);

    const searching = searchable && query.trim() !== "";
    const isVisible = (o: ParsedOption) =>
      !searching || matchesQuery(o.searchLabel ?? nodeText(o.label), query);
    const hasMatches = items.some(isVisible);

    function handleOpenChange(next: boolean) {
      if (next) {
        setQuery("");
        pendingSearchFocus.current = searchable;
      }
      setOpen(next);
      onOpenChange?.(next);
    }

    function handleContentFocus(e: React.FocusEvent) {
      if (!pendingSearchFocus.current || e.target === searchRef.current) {
        return;
      }
      pendingSearchFocus.current = false;
      searchRef.current?.focus({ preventScroll: true });
    }

    /** Hovering an item moves focus onto it (Radix behaviour), so typing while focus sits on an
     * item or the list is sent back to the search box instead of Radix's typeahead. */
    function handleContentKeyDown(e: React.KeyboardEvent) {
      if (e.target === searchRef.current || !isSearchKeystroke(e)) return;
      e.preventDefault();
      setQuery((q) => applySearchKeystroke(q, e.key));
      searchRef.current?.focus({ preventScroll: true });
    }

    /** Keys typed in the search box stay there, except Arrow Up/Down (Radix moves focus into the
     * list) and Escape (closes). Enter picks the first visible match. */
    function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = items.find((o) => !o.disabled && isVisible(o));
        if (first) {
          onChange?.({ target: { value: first.rawValue } });
          handleOpenChange(false);
        }
      }
      if (!["ArrowUp", "ArrowDown", "Escape"].includes(e.key)) {
        e.stopPropagation();
      }
    }

    /** `""` maps to the empty sentinel when a real empty item exists, otherwise stays `""` (Radix
     * shows the placeholder), so a controlled Select never hands Radix `undefined` and flips
     * from uncontrolled to controlled when a form value goes from empty to a real selection. */
    function toRadixValue(
      v: string | number | null | undefined,
    ): string | undefined {
      if (v == null) return undefined;
      const s = String(v);
      if (s === "" && items.some((o) => o.rawValue === "")) return EMPTY_VALUE;
      return s;
    }

    function fromRadixValue(v: string): string {
      return v === EMPTY_VALUE ? "" : v;
    }

    return (
      <SelectPrimitive.Root
        value={toRadixValue(value)}
        defaultValue={toRadixValue(defaultValue)}
        onValueChange={(v) =>
          onChange?.({ target: { value: fromRadixValue(v) } })
        }
        open={open}
        onOpenChange={handleOpenChange}
        disabled={disabled}
        required={required}
        name={name}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "border-border bg-background text-foreground flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-xs transition-colors",
            "data-[placeholder]:text-muted-foreground",
            "focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
            "[&>span]:line-clamp-1",
            className,
          )}
        >
          <SelectPrimitive.Value
            placeholder={placeholder ?? placeholderOption?.label}
          />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 opacity-70" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            side={side}
            avoidCollisions={side === undefined}
            sideOffset={4}
            onFocus={searchable ? handleContentFocus : undefined}
            onKeyDown={searchable ? handleContentKeyDown : undefined}
            className={cn(
              "bg-card text-card-foreground border-border relative z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border shadow-md",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
          >
            {searchable && (
              <div className="border-border border-b p-1.5">
                <ListSearchInput
                  ref={searchRef}
                  value={query}
                  onValueChange={setQuery}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            )}
            <SelectPrimitive.Viewport
              className={cn(
                "scroll-area-thin overflow-y-auto p-1",
                searchable
                  ? "max-h-[min(21rem,calc(var(--radix-select-content-available-height)-3rem))]"
                  : "max-h-[min(24rem,var(--radix-select-content-available-height))]",
              )}
            >
              {items.map((option) => {
                const visible = isVisible(option);
                const showPath = searching && option.searchLabel != null;
                return (
                  <SelectPrimitive.Item
                    key={option.rawValue === "" ? EMPTY_VALUE : option.rawValue}
                    value={
                      option.rawValue === "" ? EMPTY_VALUE : option.rawValue
                    }
                    disabled={option.disabled || !visible}
                    className={cn(
                      "relative flex min-h-11 w-full cursor-pointer items-center rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none",
                      "focus:bg-muted focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                      !visible && "hidden",
                    )}
                  >
                    {/* Stable wrapper so toggling the search path never remounts ItemText (which
                        also portals the selected label into the trigger). */}
                    <span className={showPath ? "sr-only" : undefined}>
                      <SelectPrimitive.ItemText>
                        {option.label}
                      </SelectPrimitive.ItemText>
                    </span>
                    {showPath && <span aria-hidden>{option.searchLabel}</span>}
                    <SelectPrimitive.ItemIndicator className="absolute right-2 flex h-4 w-4 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                );
              })}
              {searching && !hasMatches && (
                <p className="text-muted-foreground px-2 py-3 text-center text-sm">
                  No matches
                </p>
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);
Select.displayName = "Select";

export { Select };
