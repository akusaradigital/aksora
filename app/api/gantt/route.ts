import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { updateModuleRecord } from "@/lib/data";
import { isAdminUser } from "@/lib/auth-core";

type TimelineType = "sprint" | "plan" | "task";
function getCompanyFilter(company: string, isAdmin: boolean) {
  return isAdmin ? { clause: "", params: [] as string[] } : { clause: ` AND "company" = ?`, params: [company] };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);

  // Date range params (ISO strings: YYYY-MM-DD)
  const rangeStart = searchParams.get("start") || "";
  const rangeEnd = searchParams.get("end") || "";
  // Fallback: year-based (backward compat)
  const requestedYear = Number(searchParams.get("year") || new Date().getFullYear());
  const yearText = String(Number.isFinite(requestedYear) ? requestedYear : new Date().getFullYear());

  // "My items" filter
  const assigneeFilter = searchParams.get("assignee") || "";

  const company = user.company || "";
  const isAdmin = isAdminUser(user.role, company);
  const { clause: andCompany, params: cp } = getCompanyFilter(company, isAdmin);

  // Use date range overlap if both start/end provided, otherwise fall back to year
  const useDateRange = rangeStart.length === 10 && rangeEnd.length === 10;

  // Sprint date filter
  const sprintDateClause = useDateRange
    ? `AND "startDate" <= ? AND "endDate" >= ?`
    : `AND SUBSTR("startDate", 1, 4) = ?`;
  const sprintDateParams = useDateRange ? [rangeEnd, rangeStart] : [yearText];

  // Plan date filter
  const planDateClause = useDateRange
    ? `AND "startDate" <= ? AND "endDate" >= ?`
    : `AND SUBSTR("startDate", 1, 4) = ?`;
  const planDateParams = useDateRange ? [rangeEnd, rangeStart] : [yearText];

  // Task date filter (uses startDate/endDate)
  const taskDateClause = useDateRange
    ? `AND "startDate" >= ? AND "endDate" <= ?`
    : `AND SUBSTR("startDate", 1, 4) = ?`;
  const taskDateParams = useDateRange ? [rangeStart, rangeEnd] : [yearText];

  // Assignee filter clauses
  const planAssigneeClause = assigneeFilter ? ` AND "assignee" = ?` : "";
  const planAssigneeParams = assigneeFilter ? [assigneeFilter] : [];
  const taskAssigneeClause = assigneeFilter ? ` AND "assignee" = ?` : "";
  const taskAssigneeParams = assigneeFilter ? [assigneeFilter] : [];

  const [sprints, plans, tasks] = await Promise.all([
    db.query(
      `SELECT id, name, "startDate", "endDate", status, goal
       FROM "Sprint"
       WHERE COALESCE("startDate", '') != ''
         AND COALESCE("endDate", '') != ''
         ${sprintDateClause}
         ${andCompany}
       ORDER BY "startDate" ASC`,
      [...sprintDateParams, ...cp]
    ) as Promise<Array<Record<string, unknown>>>,
    db.query(
      `SELECT id, title, project, sprint, "startDate", "endDate", status, assignee
       FROM "TestPlan"
       WHERE COALESCE("startDate", '') != ''
         AND COALESCE("endDate", '') != ''
         AND "deletedAt" IS NULL
         ${planDateClause}
         ${planAssigneeClause}
         ${andCompany}
       ORDER BY "startDate" ASC`,
      [...planDateParams, ...planAssigneeParams, ...cp]
    ) as Promise<Array<Record<string, unknown>>>,
    db.query(
      `SELECT id, title, project, "startDate", "endDate", status, priority, assignee
       FROM "Task"
       WHERE COALESCE("startDate", '') != ''
         AND "deletedAt" IS NULL
         ${taskDateClause}
         ${taskAssigneeClause}
         ${andCompany}
       ORDER BY "startDate" ASC`,
      [...taskDateParams, ...taskAssigneeParams, ...cp]
    ) as Promise<Array<Record<string, unknown>>>,
  ]);

  return NextResponse.json({ sprints, plans, tasks });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const type = body?.type as TimelineType | undefined;
  const id = Number(body?.id);
  const startDate = String(body?.startDate ?? "").trim();
  const endDate = String(body?.endDate ?? "").trim();

  if (!type || !["sprint", "plan", "task"].includes(type)) {
    return NextResponse.json({ error: "Invalid timeline type. Must be one of: sprint, plan, task" }, { status: 400 });
  }
  if (!id || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields: type, id, startDate, endDate" }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "Start date must be on or before end date" }, { status: 400 });
  }

  const company = user.company || "";
  const isAdmin = isAdminUser(user.role, company);
  const { clause: andCompany, params: cp } = getCompanyFilter(company, isAdmin);
  const table = type === "sprint" ? "Sprint" : type === "plan" ? "TestPlan" : "Task";

  try {
    const row = await db.get(
      `SELECT * FROM "${table}" WHERE "id" = CAST(? AS INTEGER)${andCompany} LIMIT 1`,
      [id, ...cp]
    ) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (type === "sprint") {
      await updateModuleRecord("sprints", id, {
        ...row,
        startDate,
        endDate,
      });
    } else if (type === "plan") {
      await updateModuleRecord("test-plans", id, {
        ...row,
        startDate,
        endDate,
      });
    } else {
      await updateModuleRecord("tasks", id, {
        ...row,
        startDate,
        endDate,
      });
    }

    return NextResponse.json({
      type,
      item: {
        ...row,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Gantt PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
