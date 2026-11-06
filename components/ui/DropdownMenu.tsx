"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function DropdownMenu({
  modal = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root modal={modal} {...props} />;
}
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

/** The rounded box clips and an inner element scrolls, so hover rows are cut by the corners instead
 * of running into them; the scroller's track inset keeps the thumb clear of them. `customLayout`
 * skips that inner element, for menus that pin a header or footer around their own scroller
 * (`scroll-area-thin min-h-0 flex-1 overflow-y-auto`, plus `[--scrollbar-inset:0.5rem]` when it
 * reaches the box's top or bottom edge). */
function DropdownMenuContent({
  className,
  sideOffset = 4,
  customLayout = false,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  customLayout?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "bg-card text-card-foreground border-border z-50 flex min-w-48 flex-col overflow-clip rounded-lg border shadow-md",
          "max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      >
        {customLayout ? (
          children
        ) : (
          <div className="scroll-area-thin min-h-0 flex-1 overflow-y-auto p-1 [--scrollbar-inset:0.5rem]">
            {children}
          </div>
        )}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none",
        "focus:bg-muted focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-2 py-1.5 text-sm", className)}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative flex min-h-11 cursor-pointer items-center rounded-md py-2 pr-2 pl-8 text-sm outline-none",
        "focus:bg-muted focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
