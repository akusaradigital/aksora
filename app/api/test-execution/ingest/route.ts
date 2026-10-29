import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { parseTestReport, type ParsedTestResult } from "@/lib/test-report-parser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Authenticate via Session or ApiKey Bearer token
  let user = await getCurrentUser();
  let workspaceId = user?.workspaceId || user?.activeWorkspaceId || 1;
  let company = user?.company || "";

  if (!user) {
    const apiKeyData = await authenticateApiRequest(request);
    if (!apiKeyData) {
      return NextResponse.json(
        { error: "Unauthorized. Provide session or Authorization: Bearer <API_KEY>" },
        { status: 401 }
      );
    }
    workspaceId = apiKeyData.workspaceId || 1;
    company = apiKeyData.company || "";
    user = {
      id: apiKeyData.id,
      name: apiKeyData.name || "API",
      email: apiKeyData.email,
      role: apiKeyData.role || "qa",
      company,
      workspaceId,
      activeWorkspaceId: apiKeyData.workspaceId ?? null,
    };
  }

  const { andWhere, params: qParams } = getAccessScope(user);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const { testSuiteId, testPlanId = "", report, format, metadata } = body;

  if (!testSuiteId) {
    return NextResponse.json({ error: "testSuiteId is required" }, { status: 400 });
  }

  if (!report) {
    return NextResponse.json({ error: "report content or JSON is required" }, { status: 400 });
  }

  // 2. Parse report results
  const parsedTests: ParsedTestResult[] = parseTestReport(report, typeof format === "string" ? format : undefined);
  if (parsedTests.length === 0) {
    return NextResponse.json(
      { error: "No test cases found in report. Provide valid JUnit XML, Playwright JSON, or tests array." },
      { status: 400 }
    );
  }

  // 3. Verify suite exists
  const suite = await db.get<{ id: number; title: string; testPlanId?: string }>(
    `SELECT "id", "title", "testPlanId" FROM "TestSuite"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [testSuiteId, ...qParams]
  );

  if (!suite) {
    return NextResponse.json({ error: "TestSuite not found or access denied" }, { status: 404 });
  }

  const effectivePlanId = String(testPlanId || suite.testPlanId || "");

  // 4. Fetch existing test cases in this suite
  const existingCases = await db.query<{ id: number; tcId: string; caseName: string }>(
    `SELECT "id", "tcId", "caseName" FROM "TestCase"
     WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL${andWhere}`,
    [String(testSuiteId), ...qParams]
  );

  const metaObj = (metadata || {}) as Record<string, unknown>;
  const runner = String(metaObj.runner || metaObj.environment || "CI/CD Pipeline");
  const branch = metaObj.branch ? String(metaObj.branch) : "";
  const commit = metaObj.commit ? String(metaObj.commit).slice(0, 8) : "";

  // 5. Create ExecutionRun
  const lastRun = await db.get<{ maxNum: number | null }>(
    `SELECT MAX("runNumber") as "maxNum" FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [testSuiteId, ...qParams]
  );
  const runNumber = (Number(lastRun?.maxNum) || 0) + 1;

  const notes = [
    `Ingested from CI/CD (${format || "automated"})`,
    branch ? `Branch: ${branch}` : null,
    commit ? `Commit: ${commit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await db.run(
    `INSERT INTO "ExecutionRun" (
      "company", "workspaceId", "testSuiteId", "testPlanId", "runNumber", "runType",
      "status", "tester", "totalCases", "notes", "startedAt", "completedAt"
    ) VALUES (?, ?, CAST(? AS INTEGER), ?, ?, 'ci_ingest', 'completed', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [company, workspaceId, testSuiteId, effectivePlanId, runNumber, runner, parsedTests.length, notes]
  );

  const run = await db.get<{ id: number }>(
    `SELECT "id" FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER) AND "runNumber" = ? AND "deletedAt" IS NULL${andWhere}
     ORDER BY "id" DESC LIMIT 1`,
    [testSuiteId, runNumber, ...qParams]
  );

  if (!run) {
    return NextResponse.json({ error: "Failed to initialize execution run" }, { status: 500 });
  }

  // 6. Map each parsed test to TestCase or auto-create if missing
  let passedCount = 0;
  let failedCount = 0;
  let blockedCount = 0;

  for (const test of parsedTests) {
    const normalizedName = test.name.trim().toLowerCase();
    let matchedCase = existingCases.find(
      (c) =>
        c.caseName.trim().toLowerCase() === normalizedName ||
        (c.tcId && normalizedName.includes(c.tcId.toLowerCase()))
    );

    // If case does not exist in library yet, auto-create it as Automated test
    if (!matchedCase) {
      const nextSeq = existingCases.length + 1;
      const tcId = `AUTO-${String(nextSeq).padStart(3, "0")}`;
      await db.run(
        `INSERT INTO "TestCase" (
          "company", "workspaceId", "testSuiteId", "tcId", "caseName",
          "typeCase", "priority", "testStep", "expectedResult"
        ) VALUES (?, ?, CAST(? AS TEXT), ?, ?, 'Automated', 'Medium', 'Automated CI execution', 'Passes automated assertion')`,
        [company, workspaceId, String(testSuiteId), tcId, test.name]
      );
      const created = await db.get<{ id: number; tcId: string; caseName: string }>(
        `SELECT "id", "tcId", "caseName" FROM "TestCase"
         WHERE "testSuiteId" = CAST(? AS TEXT) AND "caseName" = ? AND "deletedAt" IS NULL${andWhere}
         ORDER BY "id" DESC LIMIT 1`,
        [String(testSuiteId), test.name, ...qParams]
      );
      if (created) {
        matchedCase = created;
        existingCases.push(created);
      }
    }

    if (!matchedCase) continue;

    const verdict = test.status === "Skipped" ? "Blocked" : test.status;
    if (verdict === "Passed") passedCount++;
    else if (verdict === "Failed") failedCount++;
    else if (verdict === "Blocked") blockedCount++;

    const evidence = [
      test.errorMessage ? `Error: ${test.errorMessage}` : null,
      test.stackTrace ? `Trace: ${test.stackTrace}` : null,
      test.suiteName ? `Suite: ${test.suiteName}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    await db.run(
      `INSERT INTO "CaseVerdict" (
        "company", "workspaceId", "executionRunId", "testCaseId", "verdict",
        "actualResult", "evidence", "duration", "executedAt"
      ) VALUES (?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        company,
        workspaceId,
        run.id,
        matchedCase.id,
        verdict,
        verdict === "Passed" ? "Automated test passed cleanly" : test.errorMessage || "Automated check failed",
        evidence,
        test.durationMs || 0,
      ]
    );
  }

  // 7. Update run totals
  await db.run(
    `UPDATE "ExecutionRun"
     SET "totalCases" = ?, "passed" = ?, "failed" = ?, "blocked" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)`,
    [parsedTests.length, passedCount, failedCount, blockedCount, run.id]
  );

  await logActivity(
    company,
    "ExecutionRun",
    String(run.id),
    "CI Ingest",
    `Run #${runNumber} ingested from ${runner}: ${passedCount} passed, ${failedCount} failed (${parsedTests.length} total)`,
    user?.name || user?.email || "CI/CD",
    undefined,
    workspaceId
  );

  return NextResponse.json({
    data: {
      runId: run.id,
      runNumber,
      testSuiteId,
      totalCases: parsedTests.length,
      passed: passedCount,
      failed: failedCount,
      blocked: blockedCount,
      status: "completed",
    },
  });
}
