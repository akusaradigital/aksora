import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { isAdminUser } from "@/lib/auth-core";
import { getCurrentUser } from "@/lib/auth";
import { buildSearchTokenClause, syncSearchTokens } from "@/lib/search-index";

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export function getAccessScope(user: CurrentUser | null = null) {
  const company = String(user?.company ?? "").trim();
  const isAdmin = isAdminUser(user?.role, company);
  const where = isAdmin ? "" : ' WHERE "company" = ?';
  const andWhere = isAdmin ? "" : ' AND "company" = ?';
  const params = isAdmin ? [] : [company];
  return { company, isAdmin, where, andWhere, params };
}

export function getWriteCompany(user: CurrentUser | null, dataCompany?: string) {
  const company = String(dataCompany ?? "").trim();
  if (company) return company;
  return String(user?.company ?? "").trim();
}

export function makePublicToken() {
  return randomBytes(16).toString("base64url");
}

export function normalizeTestPlanRow(item: Record<string, unknown>) {
  return {
    ...item,
    id: String(item.id ?? ""),
    code: String(item.code && String(item.code).trim() ? item.code : ""),
    publicToken: String(item.publicToken ?? ""),
    assignee: String(item.assignee ?? ""),
  };
}

export function normalizeTestSuiteRow(item: Record<string, unknown>) {
  return {
    ...item,
    id: String(item.id ?? ""),
    testPlanId: String(item.testPlanId ?? ""),
    title: String(item.title ?? ""),
    status: String(item.status ?? ""),
    publicToken: String(item.publicToken ?? ""),
  };
}

export function normalizeTestCaseRow(item: Record<string, unknown>) {
  return {
    ...item,
    id: Number(item.id ?? 0),
    testSuiteId: String(item.testSuiteId ?? ""),
    publicToken: String(item.publicToken ?? ""),
    assignee: String(item.assignee ?? ""),
    priority: String(item.priority ?? "Medium"),
    evidence: String(item.evidence ?? ""),
    status: String(item.status ?? "Pending"),
  };
}

export function getTableName(module: import("@/lib/modules").ModuleKey) {
  switch (module) {
    case "tasks":
      return "Task";
    case "bugs":
      return "Bug";
    case "test-cases":
      return "TestCase";
    case "test-plans":
      return "TestPlan";
    case "test-sessions":
      return "TestSession";
    case "test-suites":
      return "TestSuite";
    case "assignees":
      return "Assignee";
    case "meeting-notes":
      return "MeetingNote";
    case "sprints":
      return "Sprint";
    case "users":
      return "User";
    case "deployments":
      return "Deployment";
    case "work-logs":
      return "WorkLog";
    default:
      console.warn(`getTableName: unhandled module key: ${module}`);
      return "";
  }
}

export function toDatetime(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function deriveSprintStatus(startDate?: string, endDate?: string): string {
  const today = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && today < start) return "planned";
  if (end && today > end) return "completed";
  return "active";
}

export async function logActivity(company: string, type: string, id: string, action: string, summary: string, actor?: string, publicToken?: string) {
  try {
    await db.run(
      `INSERT INTO "ActivityLog" ("company", "entityType", "entityId", "action", "summary", "actor", "publicToken")
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [company, type, id, action, summary, actor || "", publicToken || ""],
    );
    const created = await db.query<{ id?: number | string }>(
      `SELECT "id" FROM "ActivityLog" WHERE "company" = ? AND "entityType" = ? AND "entityId" = ? AND "action" = ? AND "summary" = ? ORDER BY "id" DESC LIMIT 1`,
      [company, type, id, action, summary],
    );
    const createdId = created[0]?.id === undefined ? undefined : Number(created[0].id);
    if (createdId !== undefined) {
      await syncSearchTokens("activity", company, createdId, {
        entityType: type,
        entityId: id,
        action,
        summary,
      });
    }
  } catch (e) {
    console.error("Activity logging failed:", e);
  }
}



export function getSearchableColumns(module: string): string[] {
  switch (module) {
    case "tasks": return ["title", "project", "assignee", "status", "description"];
    case "bugs": return ["title", "project", "module", "severity", "priority", "status", "suggestedDev"];
    case "test-cases": return ["tcId", "caseName", "typeCase", "assignee", "status", "priority"];
    case "test-plans": return ["title", "project", "sprint", "scope", "status"];
    case "test-sessions": return ["project", "sprint", "tester", "scope", "result"];
    case "test-suites": return ["title", "assignee", "status", "notes"];
    case "meeting-notes": return ["title", "project", "content", "attendees", "actionItems", "relatedItems"];
    case "assignees": return ["name", "role", "email"];
    case "sprints": return ["name", "status", "goal"];
    case "users": return ["name", "email", "role"];
    case "deployments": return ["version", "project", "environment", "developer", "status", "changelog"];
    case "work-logs": return ["date", "category", "project", "description", "output", "assignee"];
    default: return ["title", "name", "status"];
  }
}

export function buildSearchClause(module: string, search: string, company = ""): { clause: string; params: string[] } {
  const q = search.trim();
  if (!q) return { clause: "", params: [] };
  const tokenClause = buildSearchTokenClause(module, company, q, "");
  if (tokenClause.clause) {
    return tokenClause as { clause: string; params: string[] };
  }
  const columns = getSearchableColumns(module);
  const conditions = columns.map((col) =>
    `POSITION(? IN LOWER(COALESCE("${col}", ''))) > 0`
  );
  const param = q.toLowerCase();
  return {
    clause: ` AND (${conditions.join(" OR ")})`,
    params: columns.map(() => param),
  };
}

export async function runInsert(sqlStr: string, params: any[]) {
  return db.run(sqlStr, params);
}

export async function runInsertReturningId(
  sqlStr: string,
  params: any[],
  fallbackLookup?: { query: string; params: any[] },
) {
  try {
    const inserted = await db.get<{ id?: number | string }>(`${sqlStr} RETURNING "id"`, params);
    if (inserted?.id !== undefined) {
      return Number(inserted.id);
    }
  } catch {
    // Fall through to the legacy insert + lookup path below.
  }

  await db.run(sqlStr, params);
  if (!fallbackLookup) return undefined;
  const created = await db.get<{ id?: number | string }>(fallbackLookup.query, fallbackLookup.params);
  return created?.id === undefined ? undefined : Number(created.id);
}

export async function countRows(table: string, company?: string) {
  const whereBase = company ? ' WHERE "company" = ?' : "";
  const params = company ? [company] : [];
  try {
    const whereDeleted = company ? ' WHERE "company" = ? AND "deletedAt" IS NULL' : ' WHERE "deletedAt" IS NULL';
    const rowWithDeleted = await db.get(`SELECT COUNT(*) as total FROM "${table}"${whereDeleted}`, params) as { total?: number } | undefined;
    return Number(rowWithDeleted?.total ?? 0);
  } catch {
    const row = await db.get(`SELECT COUNT(*) as total FROM "${table}"${whereBase}`, params) as { total?: number } | undefined;
    return Number(row?.total ?? 0);
  }
}

export async function syncSprintFromTestPlan({
  company,
  sprintName,
  startDate,
  endDate,
  goal,
}: {
  company: string;
  sprintName?: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}) {
  if (!sprintName?.trim()) return;
  const status = deriveSprintStatus(startDate, endDate);
  const existing = await db.get(
    `SELECT id FROM "Sprint" WHERE "name" = ? AND "company" = ?`,
    [sprintName, company],
  ) as { id: number } | undefined;

  if (existing) {
    await db.run(
      `UPDATE "Sprint" SET "startDate" = ?, "endDate" = ?, "status" = ?, "goal" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
      [startDate ?? "", endDate ?? "", status, goal ?? "", existing.id],
    );
    await syncSearchTokens("sprints", company, existing.id, {
      name: sprintName,
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      status,
      goal: goal ?? "",
    });
  } else {
    const createdId = await runInsertReturningId(
      `INSERT INTO "Sprint" ("company", "name", "startDate", "endDate", "status", "goal") VALUES (?, ?, ?, ?, ?, ?)`,
      [company, sprintName, startDate ?? "", endDate ?? "", status, goal ?? ""],
      {
        query: `SELECT "id" FROM "Sprint" WHERE "company" = ? AND "name" = ? ORDER BY "id" DESC LIMIT 1`,
        params: [company, sprintName],
      },
    );
    if (createdId !== undefined) {
      await syncSearchTokens("sprints", company, createdId, {
        name: sprintName,
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        status,
        goal: goal ?? "",
      });
    }
  }
}

