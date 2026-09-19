import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listCategories, createCategory } from "@/lib/db/categories";
import { validateCategoryInput } from "@/lib/validation/categories";

export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const categories = await listCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateCategoryInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (validated.data.parentCategoryId != null) {
    const existing = await listCategories();
    if (!existing.some((c) => c.id === validated.data.parentCategoryId)) {
      return NextResponse.json(
        { error: "parentCategoryId does not exist" },
        { status: 400 },
      );
    }
  }

  const category = await createCategory(validated.data);
  return NextResponse.json({ category }, { status: 201 });
}
