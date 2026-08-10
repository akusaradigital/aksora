import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";

// GET /api/execution-runs/[id]/export - export run as printable HTML (for PDF via browser print)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const company = user.company || "";
  const isAdmin = user.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND "company" = ?';
  const companyParams = isAdmin ? [] : [company];

  const run = await db.get<Record<string, unknown>>(
    `SELECT r.*, s."title" as "suiteTitle"
     FROM "ExecutionRun" r
     JOIN "TestSuite" s ON s."id" = r."testSuiteId"
     WHERE r."id" = CAST(? AS INTEGER) AND r."deletedAt" IS NULL${companyFilter.replace('r.', '')}`,
    [id, ...companyParams]
  );

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const verdicts = await db.query<Record<string, unknown>>(
    `SELECT v."verdict", v."actualResult", v."duration",
            tc."tcId", tc."caseName", tc."testStep", tc."expectedResult", tc."priority"
     FROM "CaseVerdict" v
     JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER)
     ORDER BY tc."id" ASC`,
    [id]
  );

  const passed = verdicts.filter(v => v.verdict === "Passed").length;
  const failed = verdicts.filter(v => v.verdict === "Failed").length;
  const blocked = verdicts.filter(v => v.verdict === "Blocked").length;
  const total = verdicts.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Execution Report - ${run.suiteTitle} Run #${run.runNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; font-size: 12px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #64748b; margin-bottom: 24px; font-size: 11px; }
    .stats { display: flex; gap: 24px; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: 900; }
    .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-top: 2px; }
    .pass { color: #059669; } .fail { color: #dc2626; } .block { color: #d97706; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:hover { background: #f8fafc; }
    .verdict { font-weight: 700; font-size: 10px; padding: 2px 8px; border-radius: 99px; display: inline-block; }
    .verdict-Passed { background: #d1fae5; color: #065f46; }
    .verdict-Failed { background: #fee2e2; color: #991b1b; }
    .verdict-Blocked { background: #fef3c7; color: #92400e; }
    .verdict-Pending { background: #f1f5f9; color: #64748b; }
    .notes { margin-top: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>${run.suiteTitle} - Run #${run.runNumber}</h1>
  <p class="meta">Tester: ${run.tester || "-"} · Date: ${run.completedAt ? new Date(String(run.completedAt)).toLocaleDateString("en-GB") : new Date(String(run.startedAt)).toLocaleDateString("en-GB")} · Company: ${company || "-"}</p>

  <div class="stats">
    <div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
    <div class="stat"><div class="stat-value pass">${passed}</div><div class="stat-label">Passed</div></div>
    <div class="stat"><div class="stat-value fail">${failed}</div><div class="stat-label">Failed</div></div>
    <div class="stat"><div class="stat-value block">${blocked}</div><div class="stat-label">Blocked</div></div>
    <div class="stat"><div class="stat-value">${passRate}%</div><div class="stat-label">Pass Rate</div></div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Test Case ID</th><th>Test Case Name</th><th>Priority</th><th>Verdict</th><th>Actual Result</th></tr>
    </thead>
    <tbody>
      ${verdicts.map((v, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${v.tcId}</td>
        <td>${v.caseName}</td>
        <td>${v.priority}</td>
        <td><span class="verdict verdict-${v.verdict}">${v.verdict}</span></td>
        <td>${v.actualResult || "-"}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  ${run.notes ? `<div class="notes"><strong>Notes:</strong> ${run.notes}</div>` : ""}

  <script class="no-print">window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
