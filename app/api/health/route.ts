import { NextResponse } from "next/server";
import { db, getDbHealthInfo } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    // Simple query to verify DB connectivity
    await db.get(`SELECT 1 as ok`);
    const latency = Date.now() - start;

    const info = await getDbHealthInfo();

    return NextResponse.json(
      { status: "healthy", db: "connected", latencyMs: latency, ...info },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    const latency = Date.now() - start;
    return NextResponse.json(
      {
        status: "unhealthy",
        db: "disconnected",
        latencyMs: latency,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
