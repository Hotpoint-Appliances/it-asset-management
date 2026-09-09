import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listDepartments, createDepartment } from "@/lib/db/departments";
import { validateDepartmentInput } from "@/lib/validation/departments";

export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = request.nextUrl;
  const limit = Number(searchParams.get("limit") ?? 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const { items, total } = await listDepartments(limit, offset);
  return NextResponse.json({ departments: items, total });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateDepartmentInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const department = await createDepartment(validated.data);
  return NextResponse.json({ department }, { status: 201 });
}
