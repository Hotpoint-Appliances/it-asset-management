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

const AUTO_DISMISS_MS = 5000;

const VARIANT_ICON: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  loading: Loader2,
};

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-destructive",
  warning: "text-warning",
  info: "text-primary",
  loading: "text-muted-foreground animate-spin",
};

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-100 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
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

  React.useEffect(() => {
    if (variant === "loading" || toast.duration === 0) return;
    const timer = setTimeout(
      () => onDismiss(toast.id),
      toast.duration ?? AUTO_DISMISS_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className="bg-card text-card-foreground border-border data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 flex items-start gap-3 rounded-xl border p-4 shadow-lg"
      data-state="open"
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", VARIANT_ICON_CLASS[variant])} />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && (
          <p className="text-muted-foreground text-sm">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex min-h-11 min-w-11 items-center justify-center opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  );
}
