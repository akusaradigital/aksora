import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { andWhere, params: qParams } = getAccessScope(user);

  const canary = await db.get<{
    id: number;
    url: string;
    method: string;
    expectedStatus: number;
    headers?: string;
  }>(
    `SELECT "id", "url", "method", "expectedStatus", "headers"
     FROM "EnvironmentCanary"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...qParams]
  );

  if (!canary) {
    return NextResponse.json({ error: "Canary not found" }, { status: 404 });
  }

  let customHeaders: Record<string, string> = {};
  try {
    if (canary.headers) customHeaders = JSON.parse(canary.headers);
  } catch {
    customHeaders = {};
  }

  const startTime = Date.now();
  let status = 0;
  let latencyMs = 0;
  let isHealthy = 0;
  let errorMsg = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(canary.url, {
      method: canary.method || "GET",
      headers: {
        "User-Agent": "Aksora-QA-Canary/1.0",
        ...customHeaders,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    latencyMs = Date.now() - startTime;
    status = res.status;
    isHealthy = status === canary.expectedStatus ? 1 : 0;
    if (!isHealthy) {
      errorMsg = `Expected HTTP ${canary.expectedStatus}, received HTTP ${status}`;
    }
  } catch (err) {
    latencyMs = Date.now() - startTime;
    isHealthy = 0;
    status = 0;
    errorMsg = err instanceof Error ? err.message : "Network error or timeout";
  }

  await db.run(
    `UPDATE "EnvironmentCanary"
     SET "lastStatus" = ?, "lastLatencyMs" = ?, "isHealthy" = ?, "lastError" = ?,
         "lastCheckedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)`,
    [status, latencyMs, isHealthy, errorMsg, id]
  );

  return NextResponse.json({
    data: {
      id: canary.id,
      status,
      latencyMs,
      isHealthy: Boolean(isHealthy),
      error: errorMsg || null,
      lastCheckedAt: new Date().toISOString(),
    },
  });
}
