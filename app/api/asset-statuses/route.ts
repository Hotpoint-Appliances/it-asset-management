import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listAssetStatuses, createAssetStatus } from "@/lib/db/assetStatuses";
import { validateAssetStatusInput } from "@/lib/validation/assetStatuses";

export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const statuses = await listAssetStatuses();
  return NextResponse.json({ statuses });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateAssetStatusInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const status = await createAssetStatus(validated.data);
  return NextResponse.json({ status }, { status: 201 });
}
