import { listDepartments } from "@/lib/db/departments";
import { DepartmentsManager } from "./DepartmentsManager";

export default async function DepartmentsPage() {
  const { items } = await listDepartments(200, 0);
  return <DepartmentsManager initialDepartments={items} />;
}
