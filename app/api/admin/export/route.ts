import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "summary";

  try {
    let csv = "";

    if (type === "companies") {
      // Export company list with metrics
      const companies = await db.query<{
        name: string;
        plan: string;
        status: string;
        maxUsers: number;
        planExpiry: string | null;
        createdAt: string;
      }>(
        `SELECT "name", "plan", "status", "maxUsers", "planExpiry", "createdAt" FROM "Company" ORDER BY "name"`
      );

      const userCounts = await db.query<{ company: string; count: number }>(
        `SELECT "company", COUNT(*) as "count" FROM "User" WHERE "deletedAt" IS NULL AND COALESCE("company", '') != '' GROUP BY "company"`
      );
      const userMap = new Map(userCounts.map((u) => [u.company, Number(u.count)]));

      csv = "Company,Plan,Status,Users,Max Users,Plan Expiry,Joined\n";
      for (const c of companies) {
        csv += `"${c.name}","${c.plan}","${c.status}",${userMap.get(c.name) || 0},${c.maxUsers},"${c.planExpiry || "N/A"}","${c.createdAt.slice(0, 10)}"\n`;
      }
    } else if (type === "revenue") {
      // Export revenue breakdown
      const PLAN_PRICES: Record<string, number> = { free: 0, pro: 490000, enterprise: 1490000 };

      const companies = await db.query<{ name: string; plan: string; status: string }>(
        `SELECT "name", "plan", "status" FROM "Company" ORDER BY "plan", "name"`
      );

      csv = "Company,Plan,Status,Monthly Revenue (IDR)\n";
      for (const c of companies) {
        const revenue = c.status === "active" ? (PLAN_PRICES[c.plan] || 0) : 0;
        csv += `"${c.name}","${c.plan}","${c.status}",${revenue}\n`;
      }

      const totalMRR = companies
        .filter((c) => c.status === "active")
        .reduce((sum, c) => sum + (PLAN_PRICES[c.plan] || 0), 0);
      csv += `\n"TOTAL MRR","","",${totalMRR}\n`;
      csv += `"TOTAL ARR","","",${totalMRR * 12}\n`;
    } else if (type === "usage") {
      // Export usage metrics per company (no sensitive data)
      const usage = await db.query<{
        company: string;
        totalBugs: number;
        totalTasks: number;
        totalTestCases: number;
        totalSprints: number;
      }>(
        `SELECT
          u."company",
          COALESCE(b.cnt, 0) as "totalBugs",
          COALESCE(t.cnt, 0) as "totalTasks",
          COALESCE(tc.cnt, 0) as "totalTestCases",
          COALESCE(s.cnt, 0) as "totalSprints"
        FROM (SELECT DISTINCT "company" FROM "User" WHERE COALESCE("company", '') != '' AND "deletedAt" IS NULL) u
        LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "Bug" WHERE "deletedAt" IS NULL GROUP BY "company") b ON b."company" = u."company"
        LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "Task" WHERE "deletedAt" IS NULL GROUP BY "company") t ON t."company" = u."company"
        LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "TestCase" WHERE "deletedAt" IS NULL GROUP BY "company") tc ON tc."company" = u."company"
        LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "Sprint" WHERE "deletedAt" IS NULL GROUP BY "company") s ON s."company" = u."company"
        ORDER BY u."company"`
      );

      csv = "Company,Bugs,Tasks,Test Cases,Sprints\n";
      for (const u of usage) {
        csv += `"${u.company}",${u.totalBugs},${u.totalTasks},${u.totalTestCases},${u.totalSprints}\n`;
      }
    } else {
      // Summary export
      const systemTotals = await db.get<{
        totalCompanies: number;
        totalUsers: number;
        totalBugs: number;
        totalTasks: number;
        totalTestCases: number;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM "Company") as "totalCompanies",
          (SELECT COUNT(*) FROM "User" WHERE "deletedAt" IS NULL) as "totalUsers",
          (SELECT COUNT(*) FROM "Bug" WHERE "deletedAt" IS NULL) as "totalBugs",
          (SELECT COUNT(*) FROM "Task" WHERE "deletedAt" IS NULL) as "totalTasks",
          (SELECT COUNT(*) FROM "TestCase" WHERE "deletedAt" IS NULL) as "totalTestCases"`
      );

      const t = systemTotals || { totalCompanies: 0, totalUsers: 0, totalBugs: 0, totalTasks: 0, totalTestCases: 0 };
      const date = new Date().toISOString().slice(0, 10);

      csv = "Aksora - Platform Summary Report\n";
      csv += `Generated: ${date}\n\n`;
      csv += "Metric,Value\n";
      csv += `Total Companies,${t.totalCompanies}\n`;
      csv += `Total Users,${t.totalUsers}\n`;
      csv += `Total Bugs,${t.totalBugs}\n`;
      csv += `Total Tasks,${t.totalTasks}\n`;
      csv += `Total Test Cases,${t.totalTestCases}\n`;
    }

    // Log export action
    await db.run(
      `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
      [user.name || user.email, "export_report", type, `Exported ${type} report`]
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aksora-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
