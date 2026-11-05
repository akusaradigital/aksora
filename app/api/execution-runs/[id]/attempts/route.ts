import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

// GET /api/execution-runs/[id]/attempts?testCaseId= - verdict history per attempt for one case
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const testCaseId = Number(request.nextUrl.searchParams.get("testCaseId"));
  if (!Number.isInteger(testCaseId) || testCaseId <= 0) {
    return NextResponse.json({ error: "testCaseId is required" }, { status: 400 });
  }

  const { andWhere, params: qParams } = getAccessScope(user);
  const run = await db.get<{ id: number }>(
    `SELECT "id" FROM "ExecutionRun" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...qParams],
  );
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const rows = await db.query<Record<string, unknown>>(
    `SELECT "id", "attempt", "verdict", "actualResult", "evidence", "duration", "source", "createdAt"
     FROM "CaseVerdictAttempt"
     WHERE "executionRunId" = ? AND "testCaseId" = ?
     ORDER BY "attempt" DESC`,
    [run.id, testCaseId],
  );
  return NextResponse.json({ data: JSON.parse(JSON.stringify(rows)) });
}
