import type { Metadata } from "next";
import { listDepartments } from "@/lib/db/departments";
import { DepartmentsManager } from "./DepartmentsManager";

export const metadata: Metadata = {
  title: "Departments",
  description: "Manage the departments assets and users belong to.",
};

export default async function DepartmentsPage() {
  const { items } = await listDepartments(200, 0);
  return <DepartmentsManager initialDepartments={items} />;
}
