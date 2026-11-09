"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, type SessionUser } from "@/lib/auth/session-context";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Toaster } from "@/components/ui/Toast";
import { RouteProgress } from "@/components/layout/RouteProgress";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionUser | null;
}) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <SessionProvider user={session}>
          <TooltipProvider delayDuration={200}>
            <React.Suspense fallback={null}>
              <RouteProgress />
            </React.Suspense>
            {children}
            <Toaster />
          </TooltipProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
