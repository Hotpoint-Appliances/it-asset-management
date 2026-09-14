"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sentinel Radix item value standing in for a real, selectable `<option value="">` — Radix
 * forbids an empty-string item value outright, so a selectable "None"/"— top level —" option
 * (as opposed to a disabled placeholder option, which never becomes an item at all — see
 * parseOptions) is rendered with this value and translated back to "" at the value/onChange
 * boundary. */
const EMPTY_VALUE = "__select-empty__";

interface ParsedOption {
  rawValue: string;
  label: React.ReactNode;
  disabled: boolean;
}

function parseOptions(children: React.ReactNode): ParsedOption[] {
  const options: ParsedOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ value?: unknown; disabled?: boolean; children?: React.ReactNode }>(child)) {
      return;
    }
    options.push({
      rawValue: child.props.value == null ? "" : String(child.props.value),
      label: child.props.children,
      disabled: !!child.props.disabled,
    });
  });
  return options;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value" | "defaultValue"> {
  value?: string | number | null;
  defaultValue?: string | number | null;
  onChange?: (e: { target: { value: string } }) => void;
  placeholder?: string;
}

/** Drop-in replacement for a native `<select>`: same `value`/`onChange`/`<option>` children API
 * (see parseOptions), rendered as a Radix Select so it gets consistent cross-browser styling,
 * keyboard nav, and the app's scrollbar treatment. A disabled `<option value="" disabled>` is
 * treated as a pure placeholder (never rendered as an item); a non-disabled `<option value="">`
 * is a real selectable "clear" option (see EMPTY_VALUE). */
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
    },
    ref,
  ) => {
    const options = React.useMemo(() => parseOptions(children), [children]);
    const placeholderOption = options.find((o) => o.rawValue === "" && o.disabled);
    const items = options.filter((o) => o !== placeholderOption);

    function toRadixValue(v: string | number | null | undefined): string | undefined {
      if (v == null) return undefined;
      const s = String(v);
      if (s === "") {
        return items.some((o) => o.rawValue === "") ? EMPTY_VALUE : undefined;
      }
      return s;
    }

    function fromRadixValue(v: string): string {
      return v === EMPTY_VALUE ? "" : v;
    }

    return (
      <SelectPrimitive.Root
        value={toRadixValue(value)}
        defaultValue={toRadixValue(defaultValue)}
        onValueChange={(v) => onChange?.({ target: { value: fromRadixValue(v) } })}
        disabled={disabled}
        required={required}
        name={name}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          className={cn(
            "border-border bg-background text-foreground flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-xs transition-colors",
            "data-[placeholder]:text-muted-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&>span]:line-clamp-1",
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder ?? placeholderOption?.label} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 opacity-70" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={cn(
              "bg-card text-card-foreground border-border relative z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border shadow-md",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
          >
            <SelectPrimitive.Viewport
              className={cn(
                "scroll-area-thin overflow-y-auto p-1",
                "max-h-[min(24rem,var(--radix-select-content-available-height))]",
              )}
            >
              {items.map((option) => (
                <SelectPrimitive.Item
                  key={option.rawValue === "" ? EMPTY_VALUE : option.rawValue}
                  value={option.rawValue === "" ? EMPTY_VALUE : option.rawValue}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex min-h-11 w-full cursor-pointer items-center rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none",
                    "focus:bg-muted focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2 flex h-4 w-4 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);
Select.displayName = "Select";

export { Select };
