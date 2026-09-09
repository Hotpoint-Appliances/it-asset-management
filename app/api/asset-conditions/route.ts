import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listAssetConditions, createAssetCondition } from "@/lib/db/assetConditions";
import { validateAssetConditionInput } from "@/lib/validation/assetConditions";

export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const conditions = await listAssetConditions();
  return NextResponse.json({ conditions });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateAssetConditionInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const condition = await createAssetCondition(validated.data);
  return NextResponse.json({ condition }, { status: 201 });
}
