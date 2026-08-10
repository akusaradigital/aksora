import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Full company detail for drill-down page
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const companyId = Number(id);
  if (!companyId || isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
  }

  try {
    // 1. Company info
    const company = await db.get<{
      id: number;
      name: string;
      plan: string;
      planExpiry: string | null;
      maxUsers: number;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT "id", "name", "plan", "planExpiry", "maxUsers", "status", "createdAt", "updatedAt"
      FROM "Company"
      WHERE "id" = CAST(? AS INTEGER)`,
      [companyId]
    );

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyName = company.name;

    // 2. Users list
    const users = await db.query<{
      id: number;
      name: string;
      email: string;
      role: string;
      createdAt: string;
    }>(
      `SELECT "id", "name", "email", "role", "createdAt"
      FROM "User"
      WHERE "company" = ? AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC`,
      [companyName]
    );

    // 3. Usage stats
    const stats = await db.get<{
      totalBugs: number;
      totalTasks: number;
      totalTestCases: number;
      totalSprints: number;
      totalTestPlans: number;
      totalTestSuites: number;
      totalMeetings: number;
      totalDeployments: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM "Bug" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalBugs",
        (SELECT COUNT(*) FROM "Task" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalTasks",
        (SELECT COUNT(*) FROM "TestCase" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalTestCases",
        (SELECT COUNT(*) FROM "Sprint" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalSprints",
        (SELECT COUNT(*) FROM "TestPlan" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalTestPlans",
        (SELECT COUNT(*) FROM "TestSuite" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalTestSuites",
        (SELECT COUNT(*) FROM "MeetingNote" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalMeetings",
        (SELECT COUNT(*) FROM "Deployment" WHERE "company" = ? AND "deletedAt" IS NULL) as "totalDeployments"`,
      [companyName, companyName, companyName, companyName, companyName, companyName, companyName, companyName]
    );

    // 4. Recent activity (last 30 entries)
    const recentActivity = await db.query<{
      id: number;
      entityType: string;
      entityId: string;
      action: string;
      summary: string;
      actor: string;
      createdAt: string;
    }>(
      `SELECT "id", "entityType", "entityId", "action", "summary", "actor", "createdAt"
      FROM "ActivityLog"
      WHERE "company" = ?
      ORDER BY "createdAt" DESC
      LIMIT 30`,
      [companyName]
    );

    // 5. Online users (presence in last 5 min)
    const onlineUsers = await db.query<{
      userId: number;
      userName: string;
      lastSeen: string;
    }>(
      `SELECT "userId", "userName", "lastSeen" FROM "PresenceHeartbeat" WHERE "company" = ? AND "lastSeen" >= NOW() - INTERVAL '5 minutes'`,
      [companyName]
    );

    // 6. Monthly activity trend (last 6 months)
    const activityTrend = await db.query<{ month: string; count: number }>(
      `SELECT TO_CHAR("createdAt", 'YYYY-MM') as "month", COUNT(*) as "count"
      FROM "ActivityLog"
      WHERE "company" = ? AND "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY "month" ASC`,
      [companyName]
    );

    // 7. Bug status distribution
    const bugsByStatus = await db.query<{ status: string; count: number }>(
      `SELECT "status", COUNT(*) as "count"
      FROM "Bug"
      WHERE "company" = ? AND "deletedAt" IS NULL
      GROUP BY "status"
      ORDER BY "count" DESC`,
      [companyName]
    );

    // 8. Task status distribution
    const tasksByStatus = await db.query<{ status: string; count: number }>(
      `SELECT "status", COUNT(*) as "count"
      FROM "Task"
      WHERE "company" = ? AND "deletedAt" IS NULL
      GROUP BY "status"
      ORDER BY "count" DESC`,
      [companyName]
    );

    // 9. Support tickets for this company
    const tickets = await db.query<{
      id: number;
      subject: string;
      status: string;
      priority: string;
      createdAt: string;
    }>(
      `SELECT "id", "subject", "status", "priority", "createdAt"
      FROM "SupportTicket"
      WHERE "company" = ?
      ORDER BY "createdAt" DESC
      LIMIT 10`,
      [companyName]
    );

    // 10. Billing history (admin audit log for this company)
    const billingHistory = await db.query<{
      id: number;
      actor: string;
      action: string;
      detail: string;
      createdAt: string;
    }>(
      `SELECT "id", "actor", "action", "detail", "createdAt"
      FROM "AdminAuditLog"
      WHERE "target" LIKE ?
      ORDER BY "createdAt" DESC
      LIMIT 20`,
      [`%#${companyId}%`]
    );

    return NextResponse.json({
      data: {
        company: JSON.parse(JSON.stringify(company)),
        users: JSON.parse(JSON.stringify(users)),
        stats: stats || { totalBugs: 0, totalTasks: 0, totalTestCases: 0, totalSprints: 0, totalTestPlans: 0, totalTestSuites: 0, totalMeetings: 0, totalDeployments: 0 },
        recentActivity: JSON.parse(JSON.stringify(recentActivity)),
        onlineUsers: JSON.parse(JSON.stringify(onlineUsers)),
        activityTrend: JSON.parse(JSON.stringify(activityTrend)),
        bugsByStatus: JSON.parse(JSON.stringify(bugsByStatus)),
        tasksByStatus: JSON.parse(JSON.stringify(tasksByStatus)),
        tickets: JSON.parse(JSON.stringify(tickets)),
        billingHistory: JSON.parse(JSON.stringify(billingHistory)),
      },
    });
  } catch (error) {
    console.error("Company detail error:", error);
    return NextResponse.json({ error: "Failed to load company details" }, { status: 500 });
  }
}

