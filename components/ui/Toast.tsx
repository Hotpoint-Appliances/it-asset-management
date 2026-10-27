"use client";

import * as React from "react";
import {
  X,
  CheckCircle2,
  CircleAlert,
  TriangleAlert,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, type Toast, type ToastVariant } from "@/store";
import { Portal } from "@/components/ui/Portal";

const AUTO_DISMISS_MS = 5000;

const VARIANT_ICON: Record<
  ToastVariant,
  React.ComponentType<{ className?: string }>
> = {
  success: CheckCircle2,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  loading: Loader2,
};

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: "text-toast-success",
  error: "text-toast-destructive",
  warning: "text-toast-warning",
  info: "text-toast-primary",
  loading: "text-toast-muted-foreground animate-spin",
};

/** Bold heading per variant; a loading toast never auto-dismisses, so it leads with its own title. */
const VARIANT_LABEL: Record<ToastVariant, string | null> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
  loading: null,
};

const VARIANT_PROGRESS_CLASS: Record<ToastVariant, string> = {
  success: "bg-toast-success",
  error: "bg-toast-destructive",
  warning: "bg-toast-warning",
  info: "bg-toast-primary",
  loading: "bg-toast-muted-foreground",
};

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <Portal>
      <div className="fixed inset-x-4 bottom-4 z-100 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </Portal>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const variant = toast.variant ?? "info";
  const Icon = VARIANT_ICON[variant];
  const label = VARIANT_LABEL[variant];
  const autoDismiss = variant !== "loading" && toast.duration !== 0;
  const [closing, setClosing] = React.useState(false);

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(
        "group bg-toast text-toast-foreground border-toast-border relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg",
        closing ? "toast-exit" : "toast-enter",
      )}
      data-state={closing ? "closed" : "open"}
      onAnimationEnd={(e) => {
        // The progress line's animationend bubbles up here too; only the card's own exit counts.
        if (closing && e.target === e.currentTarget) onDismiss(toast.id);
      }}
    >
      <Icon
        className={cn("mt-0.5 h-7 w-7 shrink-0", VARIANT_ICON_CLASS[variant])}
      />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold">{label ?? toast.title}</p>
        {label && <p className="text-sm">{toast.title}</p>}
        {toast.description && (
          <p className="text-toast-muted-foreground text-sm">
            {toast.description}
          </p>
        )}
      </div>
      {autoDismiss && (
        // Drives the auto-dismiss itself (via animationend), so pausing it on hover/focus pauses
        // the countdown with it.
        <div
          aria-hidden
          className={cn(
            "toast-progress absolute inset-x-0 bottom-0 h-1",
            VARIANT_PROGRESS_CLASS[variant],
          )}
          style={{
            animationDuration: `${toast.duration ?? AUTO_DISMISS_MS}ms`,
          }}
          onAnimationEnd={() => setClosing(true)}
        />
      )}
      <button
        onClick={() => setClosing(true)}
        className="flex min-h-11 min-w-11 items-center justify-center opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  );
}
