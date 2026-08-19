import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildGenericWorkbook } from "@/lib/excel";
import { GET as getTestGapData } from "../route";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getTestGapData();
  if (!res.ok) return res;

  const data = await res.json();
  const items = data.items || [];
  const byProject = data.byProject || [];

  const itemColumns = [
    { header: "Source", key: "source", width: 10 },
    { header: "Title", key: "title", width: 35 },
    { header: "Project", key: "project", width: 20 },
    { header: "Module", key: "module", width: 18 },
    { header: "Status", key: "status", width: 15 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Matched Cases", key: "matchedCases", width: 15 },
    { header: "Coverage", key: "coverage", width: 12 },
  ];

  const projectColumns = [
    { header: "Project", key: "project", width: 20 },
    { header: "Total Items", key: "totalItems", width: 13 },
    { header: "Covered", key: "coveredItems", width: 12 },
    { header: "Partial", key: "partialItems", width: 12 },
    { header: "Uncovered", key: "uncoveredItems", width: 12 },
    { header: "Coverage Rate (%)", key: "coverageRate", width: 18 },
    { header: "Total Cases", key: "totalCases", width: 13 },
  ];

  const workbook = await buildGenericWorkbook([
    { sheetName: "Coverage Gaps", columns: itemColumns, rows: items },
    { sheetName: "By Project", columns: projectColumns, rows: byProject },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="test-gap-export.xlsx"',
    },
  });
}
