import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, isAdmin } = getAccessScope(user);
  
  const companyFilter = isAdmin ? "" : ` AND "company" = ?`;
  const params = isAdmin ? [] : [company];

  try {
    // 1. Get all assignees (from User table)
    const assignees = await db.query<any>(`
      SELECT "id", "name", "email", "role"
      FROM "User"
      WHERE 1=1
      ${companyFilter}
      ORDER BY "name" ASC
    `, params);

    // 2. Get counts from Tasks
    const taskCounts = await db.query<any>(`
      SELECT "assignee", COUNT(*) as count
      FROM "Task"
      WHERE "status" NOT IN ('done', 'closed', 'archived')
      ${companyFilter}
      GROUP BY "assignee"
    `, params);

    // 3. Get counts from Test Plans
    const planCounts = await db.query<any>(`
      SELECT "assignee", COUNT(*) as count
      FROM "TestPlan"
      WHERE "deletedAt" IS NULL AND "status" NOT IN ('completed', 'closed', 'archived')
      ${companyFilter}
      GROUP BY "assignee"
    `, params);


    // 4. Merge data
    const workload = assignees
      .filter((a: any) => normalizeRole(String(a.role)) !== 'admin')
      .map((a: any) => {
        const name = String(a.name || a.email);
        const tasks = Number(taskCounts.find((t: any) => String(t.assignee) === name)?.count || 0);
        const plans = Number(planCounts.find((p: any) => String(p.assignee) === name)?.count || 0);
        
        // Simple workload score: Plans weigh more than tasks
        const score = (plans * 3) + tasks;
        
        return {
          id: a.id,
          name,
          email: a.email,
          role: a.role,
          tasks,
          plans,
          score,
          level: score > 10 ? 'critical' : score > 6 ? 'high' : score > 3 ? 'medium' : 'low'
        };
      });

    const totalMembers = workload.length;
    const lowCount = workload.filter(w => w.level === 'low' || w.level === 'medium').length;
    const efficiency = totalMembers > 0 ? Math.round((lowCount / totalMembers) * 100) : 0;

    return NextResponse.json({ workload, efficiency });
  } catch (error) {
    console.error("Workload report error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
