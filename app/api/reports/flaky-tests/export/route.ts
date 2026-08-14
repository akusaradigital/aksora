import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildGenericWorkbook } from "@/lib/excel";
import { GET as getFlakyData } from "../route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await getFlakyData(request);
  if (!res.ok) return res;

  const data = await res.json();
  const flakyTests = data.flakyTests || [];

  const columns = [
    { header: "Test Case ID", key: "tcId", width: 15 },
    { header: "Case Name", key: "caseName", width: 30 },
    { header: "Suite", key: "suiteTitle", width: 25 },
    { header: "Project", key: "project", width: 20 },
    { header: "Total Runs", key: "totalRuns", width: 12 },
    { header: "Passed", key: "passCount", width: 10 },
    { header: "Failed", key: "failCount", width: 10 },
    { header: "Blocked", key: "blockedCount", width: 10 },
    { header: "Flakiness Rate (%)", key: "flakinessRate", width: 18 },
    { header: "Last Verdict", key: "lastVerdict", width: 15 },
    { header: "Last Run At", key: "lastRunAt", width: 20 },
  ];

  const workbook = await buildGenericWorkbook({
    sheetName: "Flaky Tests",
    columns,
    rows: flakyTests,
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="flaky-tests-export.xlsx"',
    },
  });
}
