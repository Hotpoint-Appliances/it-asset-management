import { query } from "@/lib/db/query";

/** Unauthenticated ops health check (load balancer / monitoring / the deployment runbook's
 * sign-off). Reports only whether the DB answers: the underlying error stays in the server log,
 * since a raw pg message can carry host, port or role names. */
export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error("[health] database check failed:", err);
    return Response.json(
      { status: "error", db: "unreachable" },
      { status: 503 },
    );
  }
}
