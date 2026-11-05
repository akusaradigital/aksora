import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { buildReportPdf } from "@/lib/pdf-export";
import { loadCompanyLogo } from "@/lib/run-report";

// GET /api/test-suites/[id]/export/pdf - test library PDF; [id] is the suite id or its publicToken
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { andWhere, params: qParams } = getAccessScope(user);
  const numericId = /^\d+$/.test(id) ? Number(id) : -1;
  const suite = await db.get<{ id: number; title: string; company: string }>(
    `SELECT "id", "title", "company" FROM "TestSuite"
     WHERE ("id" = ? OR "publicToken" = ?) AND "deletedAt" IS NULL${andWhere}`,
    [numericId, id, ...qParams],
  );
  if (!suite) return NextResponse.json({ error: "Test suite not found" }, { status: 404 });

  const cases = await db.query<Record<string, unknown>>(
    `SELECT "tcId", "caseName", "priority", "preCondition", "testStep", "expectedResult"
     FROM "TestCase" WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL ORDER BY "id" ASC`,
    [String(suite.id)],
  );

  try {
    const pdf = await buildReportPdf({
      title: suite.title,
      subtitle: "Test library",
      logo: await loadCompanyLogo(suite.company),
      facts: [["Test cases", String(cases.length)]],
      columns: [
        { label: "Case ID", weight: 8 }, { label: "Case", weight: 20 }, { label: "Priority", weight: 7 },
        { label: "Precondition", weight: 15 }, { label: "Steps", weight: 28 }, { label: "Expected result", weight: 22 },
      ],
      rows: cases.map((c) => [
        String(c.tcId || ""), String(c.caseName || ""), String(c.priority || ""),
        String(c.preCondition || ""), String(c.testStep || ""), String(c.expectedResult || ""),
      ]),
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="suite-${suite.id}-library.pdf"`,
      },
    });
  } catch (error) {
    console.error("Suite PDF export error:", error);
    return NextResponse.json({ error: "Failed to build PDF" }, { status: 500 });
  }
}
