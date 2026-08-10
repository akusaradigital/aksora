import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const rows = await db.query(
      `SELECT s.id, s.title, s."testPlanId", p.code as "testPlanCode", p.title as "testPlanTitle"
       FROM "TestSuite" s
      LEFT JOIN "TestPlan" p ON p.id = CAST(s."testPlanId" AS INTEGER)
      INNER JOIN "TestCase" c ON CAST(c."testSuiteId" AS INTEGER) = s.id
       WHERE s."deletedAt" IS NULL AND c."deletedAt" IS NULL
       GROUP BY s.id, s.title, s."testPlanId", p.code, p.title
       ORDER BY MAX(s."updatedAt") DESC
       LIMIT 5`
    ) as Record<string, unknown>[];
    const normalized = rows.map((row) => ({
      ...row,
      title: String(row.title ?? ""),
      testPlanId: String(row.testPlanId ?? ""),
      testPlanCode: String(row.testPlanCode ?? ""),
      testPlanTitle: String(row.testPlanTitle ?? ""),
    }));
    return NextResponse.json(JSON.parse(JSON.stringify(normalized)));
  } catch {
    return NextResponse.json([]);
  }
}
