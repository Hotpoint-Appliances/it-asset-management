import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listLocations, createLocation } from "@/lib/db/locations";
import { validateLocationInput } from "@/lib/validation/locations";

export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const locations = await listLocations();
  return NextResponse.json({ locations });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateLocationInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (validated.data.parentLocationId != null) {
    const existing = await listLocations();
    if (!existing.some((l) => l.id === validated.data.parentLocationId)) {
      return NextResponse.json(
        { error: "parentLocationId does not exist" },
        { status: 400 },
      );
    }
  }

  const location = await createLocation(validated.data);
  return NextResponse.json({ location }, { status: 201 });
}
