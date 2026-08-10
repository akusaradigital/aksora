import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getTestSuite, makePublicToken } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";
import { friendlyErrorMessage } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const company = user.company || "";
  const isAdmin = isAdminUser(user.role, company);

  try {
    const formData = await request.formData();
    const testSuiteId = String(formData.get("testSuiteId") || "");
    const tcId = String(formData.get("tcId") || "");
    const typeCase = String(formData.get("typeCase") || "");
    const preCondition = String(formData.get("preCondition") || "");
    const caseName = String(formData.get("caseName") || "");
    const testStep = String(formData.get("testStep") || "");
    const expectedResult = String(formData.get("expectedResult") || "");
    const actualResult = String(formData.get("actualResult") || "");
    const status = String(formData.get("status") || "Pending");
    const evidence = String(formData.get("evidence") || "");
    const priority = String(formData.get("priority") || "Medium");

    if (!testSuiteId || !tcId || !typeCase || !caseName || !testStep || !expectedResult) {
      return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
    }

    if (!isAdmin) {
      const suite = await db.get('SELECT "company" FROM "TestSuite" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL', [testSuiteId]) as { company?: string } | undefined;
      if (!suite || suite.company !== company) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await db.run(
      `INSERT INTO "TestCase" ("company", "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", "testStep", "expectedResult", "actualResult", "status", "evidence", "priority")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company, makePublicToken(), testSuiteId, tcId, typeCase, preCondition, caseName, testStep, expectedResult, actualResult, status, evidence, priority]
    );

    revalidatePath("/test-cases");
    const suite = await getTestSuite(testSuiteId);
    if (suite && (suite as Record<string, unknown>).publicToken) {
      revalidatePath(`/test-execution/${String((suite as Record<string, unknown>).publicToken)}`);
    }

    return NextResponse.json({ message: "Test case added successfully." });
  } catch (error) {
    return NextResponse.json({ error: friendlyErrorMessage(error, "Failed to save test case.") }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = user.company || "";
  const isAdmin = isAdminUser(user.role, company);

  const idStr = request.nextUrl.searchParams.get("id");
  const id = idStr ? Number(idStr) : null;

  if (!id) {
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  }

  try {
    const companyFilter = isAdmin ? "" : ' AND "company" = ?';
    const companyParam = isAdmin ? [] : [company];

    const tc = await db.get(
      `SELECT "testSuiteId" FROM "TestCase" WHERE id = CAST(? AS INTEGER)${companyFilter}`,
      [id, ...companyParam]
    ) as { testSuiteId?: string } | undefined;

    if (!tc) return NextResponse.json({ error: "Test case not found." }, { status: 404 });

    await db.run(
      `UPDATE "TestCase" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
      [id, ...companyParam]
    );

    revalidatePath("/test-cases");
    if (tc.testSuiteId) {
      const suite = await getTestSuite(tc.testSuiteId);
      if (suite && (suite as Record<string, unknown>).publicToken) {
        revalidatePath(`/test-execution/${String((suite as Record<string, unknown>).publicToken)}`);
      }
    }

    return NextResponse.json({ message: "Test case deleted successfully." });
  } catch (error) {
    return NextResponse.json({ error: friendlyErrorMessage(error, "Failed to delete test case.") }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const company = user.company || "";
  const isAdmin = isAdminUser(user.role, company);

  try {
    const data = await request.json();
    const rows = data.rows as Record<string, unknown>[];

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid execution data." }, { status: 400 });
    }

    const companyFilter = isAdmin ? "" : ' AND "company" = ?';
    const companyParam = isAdmin ? [] : [company];

    for (const tc of rows) {
      if (tc.id) {
        await db.run(
          `UPDATE "TestCase"
           SET status = ?, "actualResult" = ?, evidence = ?, priority = ?, "updatedAt" = CURRENT_TIMESTAMP
           WHERE id = CAST(? AS INTEGER)${companyFilter}`,
          [tc.status || "Pending", tc.actualResult || "", tc.evidence || "", tc.priority || "Medium", tc.id, ...companyParam]
        );
      }
    }

    revalidatePath("/test-cases");

    return NextResponse.json({ message: "Execution saved successfully." });
  } catch (error) {
    return NextResponse.json({ error: friendlyErrorMessage(error, "Failed to save test case execution.") }, { status: 400 });
  }
}
