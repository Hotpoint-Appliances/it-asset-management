import { listUsers } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { listDepartments } from "@/lib/db/departments";
import { UsersManager } from "./UsersManager";

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
