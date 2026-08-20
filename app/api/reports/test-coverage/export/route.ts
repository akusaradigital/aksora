import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildGenericWorkbook } from "@/lib/excel";
import { GET as getCoverageData } from "../route";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getCoverageData();
  if (!res.ok) return res;

  const data = await res.json();
  const bySuite = data.bySuite || [];
  const byProject = data.byProject || [];

  const suiteColumns = [
    { header: "Project", key: "project", width: 20 },
    { header: "Suite Title", key: "suiteTitle", width: 30 },
    { header: "Total", key: "total", width: 10 },
    { header: "Passed", key: "passed", width: 10 },
    { header: "Failed", key: "failed", width: 10 },
    { header: "Blocked", key: "blocked", width: 10 },
    { header: "Pending", key: "pending", width: 10 },
    { header: "Coverage Rate (%)", key: "coverageRate", width: 18 },
    { header: "Pass Rate (%)", key: "passRate", width: 15 },
  ];

  const projectColumns = [
    { header: "Project", key: "project", width: 20 },
    { header: "Total", key: "total", width: 10 },
    { header: "Passed", key: "passed", width: 10 },
    { header: "Failed", key: "failed", width: 10 },
    { header: "Blocked", key: "blocked", width: 10 },
    { header: "Pending", key: "pending", width: 10 },
    { header: "Coverage Rate (%)", key: "coverageRate", width: 18 },
    { header: "Pass Rate (%)", key: "passRate", width: 15 },
  ];

  const workbook = await buildGenericWorkbook([
    { sheetName: "By Suite", columns: suiteColumns, rows: bySuite },
    { sheetName: "By Project", columns: projectColumns, rows: byProject },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="test-coverage-export.xlsx"',
    },
  });
}
