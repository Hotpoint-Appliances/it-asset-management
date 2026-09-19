export interface Department {
  id: number;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentInput {
  name: string;
  code: string | null;
}
