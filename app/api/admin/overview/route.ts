import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Company list with plan/status info
    const companyList = await db.query<{
      id: number;
      name: string;
      plan: string;
      planExpiry: string | null;
      maxUsers: number;
      status: string;
      createdAt: string;
    }>(
      `SELECT "id", "name", "plan", "planExpiry", "maxUsers", "status", "createdAt"
      FROM "Company"
      ORDER BY "createdAt" DESC`
    );

    // 2. Usage metrics per company (aggregate counts, no detail)
    const usageMetrics = await db.query<{
      company: string;
      totalUsers: number;
      totalBugs: number;
      totalTasks: number;
      totalTestCases: number;
      totalSprints: number;
    }>(
      `SELECT
        u."company",
        COUNT(DISTINCT u."id") as "totalUsers",
        COALESCE(b.cnt, 0) as "totalBugs",
        COALESCE(t.cnt, 0) as "totalTasks",
        COALESCE(tc.cnt, 0) as "totalTestCases",
        COALESCE(s.cnt, 0) as "totalSprints"
      FROM "User" u
      LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "Bug" WHERE "deletedAt" IS NULL GROUP BY "company") b ON b."company" = u."company"
      LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "Task" WHERE "deletedAt" IS NULL GROUP BY "company") t ON t."company" = u."company"
      LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "TestCase" WHERE "deletedAt" IS NULL GROUP BY "company") tc ON tc."company" = u."company"
      LEFT JOIN (SELECT "company", COUNT(*) as cnt FROM "Sprint" WHERE "deletedAt" IS NULL GROUP BY "company") s ON s."company" = u."company"
      WHERE COALESCE(u."company", '') != '' AND COALESCE(u."deletedAt", '') = ''
      GROUP BY u."company"
      ORDER BY "totalUsers" DESC`
    );

    // 3. Last activity per company
    const lastActivity = await db.query<{
      company: string;
      lastActivityAt: string;
    }>(
      `SELECT "company", MAX("createdAt") as "lastActivityAt"
      FROM "ActivityLog"
      WHERE COALESCE("company", '') != ''
      GROUP BY "company"`
    );

    // 4. Monthly active users per company (users with presence in last 30 days)
    const mauData = await db.query<{
      company: string;
      mau: number;
    }>(
      `SELECT "company", COUNT(DISTINCT "userId") as "mau"
      FROM "PresenceHeartbeat"
      WHERE COALESCE("company", '') != ''
      GROUP BY "company"`
    );

    // 5. System-wide totals
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

    // 6. Growth: new companies per month (last 6 months)
    const growthData = await db.query<{ month: string; count: number }>(
      `SELECT TO_CHAR("createdAt", 'YYYY-MM') as "month", COUNT(*) as "count"
      FROM "Company"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY "month" ASC`
    );

    // 7. Role distribution across all companies
    const roleDistribution = await db.query<{
      role: string;
      count: number;
    }>(
      `SELECT "role", COUNT(*) as "count"
      FROM "User"
      WHERE "deletedAt" IS NULL AND COALESCE("company", '') != ''
      GROUP BY "role"
      ORDER BY "count" DESC`
    );

    // Build company details with health indicator
    const lastActivityMap = new Map(lastActivity.map((a) => [a.company, a.lastActivityAt]));
    const mauMap = new Map(mauData.map((m) => [m.company, m.mau]));
    const usageMap = new Map(usageMetrics.map((u) => [u.company, u]));

    const companyDetails = companyList.map((c) => {
      const usage = usageMap.get(c.name);
      const lastAct = lastActivityMap.get(c.name);
      const mau = mauMap.get(c.name) || 0;

      // Health indicator logic
      let health: "green" | "yellow" | "red" = "green";
      if (lastAct) {
        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(lastAct).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActivity > 30) health = "red";
        else if (daysSinceActivity > 7) health = "yellow";
      } else {
        health = "red"; // no activity ever
      }

      // Check plan expiry
      if (c.planExpiry) {
        const daysUntilExpiry = Math.floor(
          (new Date(c.planExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry < 0) health = "red";
        else if (daysUntilExpiry < 14) health = "yellow";
      }

      // Check user limit
      const userCount = usage?.totalUsers || 0;
      if (userCount >= c.maxUsers) health = "yellow";

      return {
        ...c,
        totalUsers: userCount,
        totalBugs: usage?.totalBugs || 0,
        totalTasks: usage?.totalTasks || 0,
        totalTestCases: usage?.totalTestCases || 0,
        totalSprints: usage?.totalSprints || 0,
        lastActivityAt: lastAct || null,
        mau,
        health,
      };
    });

    // Build alerts for expiring/expired companies
    const alerts: { company: string; companyId: number; type: "expired" | "expiring"; daysLeft: number; plan: string }[] = [];
    for (const c of companyDetails) {
      if (c.planExpiry) {
        const daysLeft = Math.floor((new Date(c.planExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) {
          alerts.push({ company: c.name, companyId: c.id, type: "expired", daysLeft, plan: c.plan });
        } else if (daysLeft <= 14) {
          alerts.push({ company: c.name, companyId: c.id, type: "expiring", daysLeft, plan: c.plan });
        }
      }
      if (c.status === "suspended") {
        alerts.push({ company: c.name, companyId: c.id, type: "expired", daysLeft: -1, plan: c.plan });
      }
    }

    return NextResponse.json({
      data: {
        systemTotals: systemTotals || { totalCompanies: 0, totalUsers: 0, totalBugs: 0, totalTasks: 0, totalTestCases: 0 },
        companies: JSON.parse(JSON.stringify(companyDetails)),
        roleDistribution: JSON.parse(JSON.stringify(roleDistribution)),
        growthData: JSON.parse(JSON.stringify(growthData)),
        alerts: JSON.parse(JSON.stringify(alerts)),
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Failed to load admin overview" }, { status: 500 });
  }
}

// Quick actions: suspend/activate company, extend trial, update quota
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, companyId, value } = body as {
      action: string;
      companyId: number;
      value?: string | number;
    };

    if (!action || !companyId) {
      return NextResponse.json({ error: "action and companyId are required" }, { status: 400 });
    }

    switch (action) {
      case "suspend":
        await db.run(
          'UPDATE "Company" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
          ["suspended", companyId]
        );
        await db.run(
          `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
          [user.name || user.email, "suspend_company", `company #${companyId}`, "Company suspended"]
        );
        break;

      case "activate":
        await db.run(
          'UPDATE "Company" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
          ["active", companyId]
        );
        await db.run(
          `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
          [user.name || user.email, "activate_company", `company #${companyId}`, "Company activated"]
        );
        break;

      case "extend_trial":
        // Extend by 30 days from now
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);
        await db.run(
          'UPDATE "Company" SET "planExpiry" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
          [newExpiry.toISOString().slice(0, 10), companyId]
        );
        await db.run(
          `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
          [user.name || user.email, "extend_trial", `company #${companyId}`, `Extended to ${newExpiry.toISOString().slice(0, 10)}`]
        );
        break;

      case "update_quota":
        if (!value || typeof value !== "number" || value < 1) {
          return NextResponse.json({ error: "Invalid quota value" }, { status: 400 });
        }
        await db.run(
          'UPDATE "Company" SET "maxUsers" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
          [value, companyId]
        );
        await db.run(
          `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
          [user.name || user.email, "update_quota", `company #${companyId}`, `Max users set to ${value}`]
        );
        break;

      case "update_plan":
        if (!value || !["free", "pro", "enterprise"].includes(String(value))) {
          return NextResponse.json({ error: "Invalid plan value" }, { status: 400 });
        }
        // Auto-set maxUsers based on plan
        const { getMaxUsersForPlan } = await import("@/lib/plan-limits");
        const newMaxUsers = getMaxUsersForPlan(String(value));
        await db.run(
          'UPDATE "Company" SET "plan" = ?, "maxUsers" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
          [value, newMaxUsers, companyId]
        );
        await db.run(
          `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
          [user.name || user.email, "update_plan", `company #${companyId}`, `Plan changed to ${value} (maxUsers: ${newMaxUsers})`]
        );
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin action error:", error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
