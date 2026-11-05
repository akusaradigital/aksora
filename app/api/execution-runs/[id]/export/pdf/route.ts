import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { buildReportPdf } from "@/lib/pdf-export";
import { getRunReport, loadCompanyLogo, formatSeconds } from "@/lib/run-report";

// GET /api/execution-runs/[id]/export/pdf - run report PDF with a company logo cover
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { andWhere, params: qParams } = getAccessScope(user);
  const report = await getRunReport({ id, andWhere, params: qParams });
  if (!report) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  try {
    const { run, stats } = report;
    const date = new Date(run.completedAt || run.startedAt || Date.now())
      .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const pdf = await buildReportPdf({
      title: `${report.suiteTitle} - Run #${run.runNumber}`,
      subtitle: `${date} · Tester: ${run.tester || "-"} · Attempt #${run.attempt}`,
      logo: await loadCompanyLogo(run.company),
      facts: [
        ["Pass rate", `${stats.passRate}%`],
        ["Total", String(stats.total)],
        ["Passed", String(stats.passed)],
        ["Failed", String(stats.failed)],
        ["Blocked", String(stats.blocked)],
        ["Pending", String(stats.pending)],
        ["Duration", formatSeconds(stats.totalDuration)],
        ["Sign-off", report.outcome],
      ],
      columns: [
        { label: "#", weight: 3 }, { label: "Case ID", weight: 8 }, { label: "Case", weight: 30 },
        { label: "Priority", weight: 8 }, { label: "Verdict", weight: 8 }, { label: "Actual result", weight: 35 },
        { label: "Duration", weight: 8 },
      ],
      rows: report.cases.map((c, i) => [
        String(i + 1), c.tcId, c.caseName, c.priority, c.verdict, c.actualResult, c.duration ? formatSeconds(c.duration) : "-",
      ]),
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="run-${run.runNumber}-report.pdf"`,
      },
    });
  } catch (error) {
    console.error("Run PDF export error:", error);
    return NextResponse.json({ error: "Failed to build PDF" }, { status: 500 });
  }
}
