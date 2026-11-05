import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity, getAccessScope, makePublicToken } from "@/lib/data-helpers";

// POST /api/execution-runs/[id]/share - ensure a public token and return the client report URL
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);
  const run = await db.get<{ id: number; runNumber: number; publicToken: string | null }>(
    `SELECT "id", "runNumber", "publicToken" FROM "ExecutionRun"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...qParams],
  );
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  let token = String(run.publicToken || "");
  if (!token) {
    token = makePublicToken();
    await db.run(`UPDATE "ExecutionRun" SET "publicToken" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [token, run.id]);
    await logActivity(company, "ExecutionRun", String(run.id), "Shared", `Run #${run.runNumber} client report link created`,
      user.name || user.email || "", undefined, workspaceId);
  }
  return NextResponse.json({ data: { token, url: `${request.nextUrl.origin}/report/run/${token}` } });
}
