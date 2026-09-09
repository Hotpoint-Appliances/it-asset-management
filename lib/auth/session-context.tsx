"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RoleName } from "./session";

export interface SessionUser {
  userId: string;
  fullName: string;
  email: string;
  roleName: RoleName;
  departmentId: number | null;
}

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/** Client-side access to the server-verified session — never decodes the JWT itself. */
export function useSession() {
  return useContext(SessionContext);
}
