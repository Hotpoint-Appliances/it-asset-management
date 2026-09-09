import { query } from "@/lib/db/query";

export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ status: "ok", db: "connected" });
  } catch (err) {
    return Response.json(
      { status: "error", db: "unreachable", message: (err as Error).message },
      { status: 503 },
    );
  }
}
