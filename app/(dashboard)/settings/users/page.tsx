import type { Metadata } from "next";
import { listUsers } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { listDepartments } from "@/lib/db/departments";
import { UsersManager } from "./UsersManager";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage user accounts, roles and departments.",
};

export default async function UsersPage() {
  const [users, roles, departmentsPage] = await Promise.all([
    listUsers({ roleName: "admin", departmentId: null }),
    listRoles(),
    listDepartments(1000, 0),
  ]);

  return (
    <UsersManager
      initialUsers={users}
      roles={roles}
      departments={departmentsPage.items}
    />
  );
}
