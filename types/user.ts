import type { RoleName } from "@/lib/auth/session";

export interface User {
  id: string;
  fullName: string;
  email: string;
  roleName: RoleName;
  departmentId: number | null;
  isActive: boolean;
}

export interface Role {
  id: number;
  name: RoleName;
  description: string | null;
}
