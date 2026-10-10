"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        arrowPadding={8}
        className={cn(
          "bg-foreground text-background z-50 rounded-md px-2.5 py-1.5 text-xs font-medium shadow-md",
          "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0",
          className,
        )}
        {...props}
      >
        {children}
        {/* Custom path so the tip is rounded; Radix's default polygon is sharp. */}
        <TooltipPrimitive.Arrow
          width={12}
          height={6}
          asChild
          className="fill-foreground"
        >
          <svg viewBox="0 0 12 6" preserveAspectRatio="none">
            <path d="M0 0H12L7.56 4.44Q6 6 4.44 4.44Z" />
          </svg>
        </TooltipPrimitive.Arrow>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
