import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listVendors, createVendor } from "@/lib/db/vendors";
import { validateVendorInput } from "@/lib/validation/vendors";

export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = request.nextUrl;
  const limit = Number(searchParams.get("limit") ?? 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const { items, total } = await listVendors(limit, offset);
  return NextResponse.json({ vendors: items, total });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateVendorInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const vendor = await createVendor(validated.data);
  return NextResponse.json({ vendor }, { status: 201 });
}
