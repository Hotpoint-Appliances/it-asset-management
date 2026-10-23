import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listAccessories, createAccessory } from "@/lib/db/accessories";
import { validateAccessoryInput } from "@/lib/validation/accessories";
import { isUniqueViolation } from "@/lib/db/query";

/** ?active=1 returns only the entries pickers may offer. */
export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const activeOnly = request.nextUrl.searchParams.get("active") === "1";
  const accessories = await listAccessories({ activeOnly });
  return NextResponse.json({ accessories });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateAccessoryInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const accessory = await createAccessory(validated.data);
    return NextResponse.json({ accessory }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "An accessory with this name already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
