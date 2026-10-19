import { NextResponse } from "next/server";
import { db, getDbHealthInfo } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// This endpoint is public (listed in proxy.ts's publicPaths) for uptime
// monitors/load balancers, so it must never echo raw error text (DB host,
// port, auth-failure detail) or infra metrics (table row counts, pool
// stats) to an unauthenticated caller. Extra diagnostics are only included
// when the caller is already an authenticated management admin.
export async function GET() {
  const start = Date.now();
  const mem = process.memoryUsage();
  const memorySummary = {
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
  };

  const user = await getCurrentUser().catch(() => null);
  const isAdmin = !!user && isManagementAdmin(user.role, user.company);

  try {
    // Simple query to verify DB connectivity
    await db.get(`SELECT 1 as ok`);
    const latency = Date.now() - start;

    const info = isAdmin ? await getDbHealthInfo() : {};

    return NextResponse.json(
      {
        status: "healthy",
        db: "connected",
        latencyMs: latency,
        env: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
        ...(isAdmin ? { memory: memorySummary, ...info } : {}),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    logger.error("Health check DB connectivity failed", err);
    const latency = Date.now() - start;
    return NextResponse.json(
      {
        status: "unhealthy",
        db: "disconnected",
        latencyMs: latency,
        env: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
        ...(isAdmin
          ? { memory: memorySummary, error: err instanceof Error ? err.message : "Unknown error" }
          : {}),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
