import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import {
  listCategories,
  updateCategory,
  deleteCategory,
} from "@/lib/db/categories";
import { validateCategoryInput } from "@/lib/validation/categories";
import { collectDescendantIds } from "@/lib/tree";
import { ReferencedByAssetsError } from "@/lib/db/refCheck";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const validated = validateCategoryInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const parentId = validated.data.parentCategoryId;
  if (parentId != null) {
    if (parentId === id) {
      return NextResponse.json(
        { error: "A category cannot be its own parent" },
        { status: 400 },
      );
    }
    const existing = await listCategories();
    if (!existing.some((c) => c.id === parentId)) {
      return NextResponse.json(
        { error: "parentCategoryId does not exist" },
        { status: 400 },
      );
    }
    const descendants = collectDescendantIds(
      existing.map((c) => ({
        id: c.id,
        parentId: c.parentCategoryId,
        name: c.name,
      })),
      id,
    );
    if (descendants.has(parentId)) {
      return NextResponse.json(
        { error: "Cannot move a category under one of its own descendants" },
        { status: 400 },
      );
    }
  }

  const category = await updateCategory(id, validated.data);
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  return NextResponse.json({ category });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const deleted = await deleteCategory(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }
  } catch (err) {
    if (err instanceof ReferencedByAssetsError) {
      return NextResponse.json(
        { error: "Cannot delete: still referenced by one or more assets." },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
