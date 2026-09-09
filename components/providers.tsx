"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, type SessionUser } from "@/lib/auth/session-context";

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
        <SessionProvider user={session}>{children}</SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
