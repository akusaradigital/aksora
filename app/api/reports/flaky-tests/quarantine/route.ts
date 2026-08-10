import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

// GET: List quarantined test cases
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company: _company, isAdmin, params } = getAccessScope(user);
  const companyFilter = isAdmin ? "" : ' AND "company" = ?';

  try {
    const rows = await db.query<{
      id: number;
      tcId: string;
      caseName: string;
      quarantined: number;
      quarantinedAt: string;
      quarantineReason: string;
      consecutivePasses: number;
      status: string;
    }>(
      `SELECT "id", "tcId", "caseName", "quarantined", "quarantinedAt", "quarantineReason", "consecutivePasses", "status"
       FROM "TestCase"
       WHERE "deletedAt" IS NULL AND "quarantined" = 1 ${companyFilter}
       ORDER BY "quarantinedAt" DESC`,
      params,
    );

    return NextResponse.json({ quarantined: rows });
  } catch (error) {
    console.error("Quarantine list error:", error);
    return NextResponse.json({ error: "Failed to load quarantined tests" }, { status: 500 });
  }
}

// POST: Quarantine or unquarantine a test case
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company, isAdmin, params: _params } = getAccessScope(user);
  const actor = user?.name || user?.email || "";

  try {
    const body = await request.json();
    const { testCaseId, action, reason, autoReactivateAfter: _autoReactivateAfter } = body;

    if (!testCaseId) {
      return NextResponse.json({ error: "testCaseId is required" }, { status: 400 });
    }

    const companyFilter = isAdmin ? "" : ' AND "company" = ?';
    const queryParams = isAdmin ? [testCaseId] : [testCaseId, company];

    // Verify test case exists
    const testCase = await db.get<{ id: number; tcId: string; caseName: string; quarantined: number }>(
      `SELECT "id", "tcId", "caseName", "quarantined" FROM "TestCase" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL ${companyFilter}`,
      queryParams,
    );

    if (!testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    if (action === "quarantine") {
      await db.run(
        `UPDATE "TestCase" SET "quarantined" = 1, "quarantinedAt" = CURRENT_TIMESTAMP, "quarantineReason" = ?, "consecutivePasses" = 0, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
        [reason || "Flaky test - quarantined for stability", testCaseId],
      );

      await logActivity(company, "TestCase", testCase.tcId, "Quarantined", `Test case ${testCase.tcId} quarantined: ${reason || "Flaky"}`, actor);

      return NextResponse.json({
        message: `Test case ${testCase.tcId} has been quarantined.`,
        quarantined: true,
      });
    }

    if (action === "unquarantine") {
      await db.run(
        `UPDATE "TestCase" SET "quarantined" = 0, "quarantinedAt" = NULL, "quarantineReason" = '', "consecutivePasses" = 0, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
        [testCaseId],
      );

      await logActivity(company, "TestCase", testCase.tcId, "Unquarantined", `Test case ${testCase.tcId} reactivated`, actor);

      return NextResponse.json({
        message: `Test case ${testCase.tcId} has been reactivated.`,
        quarantined: false,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'quarantine' or 'unquarantine'." }, { status: 400 });
  } catch (error) {
    console.error("Quarantine action error:", error);
    return NextResponse.json({ error: "Failed to update quarantine status" }, { status: 500 });
  }
}
