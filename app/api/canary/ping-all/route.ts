import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { andWhere, params: qParams } = getAccessScope(user);
  const environment = request.nextUrl.searchParams.get("environment") || "";

  let extraWhere = "";
  const extraParams: unknown[] = [];

  if (environment) {
    extraWhere += ' AND "environment" = ?';
    extraParams.push(environment);
  }

  const canaries = await db.query<{
    id: number;
    name: string;
    url: string;
    method: string;
    expectedStatus: number;
    headers?: string;
    environment: string;
  }>(
    `SELECT "id", "name", "url", "method", "expectedStatus", "headers", "environment"
     FROM "EnvironmentCanary"
     WHERE "active" = 1 AND "deletedAt" IS NULL${andWhere}${extraWhere}`,
    [...qParams, ...extraParams]
  );

  const results = await Promise.allSettled(
    canaries.map(async (canary) => {
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
        const timeout = setTimeout(() => controller.abort(), 8_000);

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
        [status, latencyMs, isHealthy, errorMsg, canary.id]
      );

      return {
        id: canary.id,
        name: canary.name,
        environment: canary.environment,
        url: canary.url,
        status,
        latencyMs,
        isHealthy: Boolean(isHealthy),
        error: errorMsg || null,
      };
    })
  );

  const payload = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { id: -1, isHealthy: false, error: "Execution error" }
  );

  return NextResponse.json({ data: payload });
}
