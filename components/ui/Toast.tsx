"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store";

const AUTO_DISMISS_MS = 5000;

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  React.useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-100 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            "bg-card text-card-foreground border-border flex items-start gap-3 rounded-xl border p-4 shadow-lg",
          )}
        >
          {toast.variant === "error" ? (
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="text-success mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.description && (
              <p className="text-muted-foreground text-sm">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex min-h-11 min-w-11 items-center justify-center opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        </div>
      ))}
    </div>
  );
}
