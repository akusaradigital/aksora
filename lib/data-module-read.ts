import { db } from "@/lib/db";
import { codeFromId } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { type ModuleKey } from "@/lib/modules";
import { buildSearchClause, getAccessScope, normalizeTestCaseRow, normalizeTestPlanRow, normalizeTestSuiteRow } from "@/lib/data-helpers";
import { generateDeploymentNotes } from "@/lib/deployment-notes";
import { normalizeRole, isWorkspaceAdmin } from "@/lib/roles";

async function selectAll(sqlStr: string, params: unknown[] = []): Promise<Array<Record<string, string | number | null>>> {
  return db.query<Record<string, string | number | null>>(sqlStr, params);
}

function hydrateDeploymentNotes<T extends Record<string, unknown>>(row: T) {
  if (!row) return row;
  return {
    ...row,
    notes: generateDeploymentNotes(String(row.changelog ?? "")),
  };
}

export async function getModuleRows(module: ModuleKey) {
  const currentUser = await getCurrentUser();
  const scope = getAccessScope(currentUser);
  const { company, isAdmin, where, andWhere, params: qParams } = scope;

  switch (module) {
    case "test-plans":
      return (await selectAll(`SELECT "id", "company", "publicToken", "title", "project", "sprint", "scope", "status", "startDate", "endDate", "notes", "assignee", "createdAt", "updatedAt", "deletedAt" FROM "TestPlan" WHERE "deletedAt" IS NULL ${andWhere} ORDER BY "updatedAt" DESC`, qParams)).map((item) => {
        const normalized = normalizeTestPlanRow(item);
        return {
          ...normalized,
          code: codeFromId("PLAN", Number(item.id)),
          publicToken: normalized.publicToken || "",
        };
      });
    case "test-sessions":
      return await selectAll(`SELECT "id", "company", "publicToken", "project", "date", "tester", "scope", "totalCases", "passed", "failed", "blocked", "result", "notes", "createdAt", "updatedAt", "deletedAt" FROM "TestSession" WHERE "deletedAt" IS NULL ${andWhere} ORDER BY "updatedAt" DESC`, qParams);
    case "test-cases":
      return (await selectAll(`SELECT "id", "company", "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", "assignee", "testStep", "expectedResult", "actualResult", "status", "evidence", "priority", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "TestCase" WHERE "deletedAt" IS NULL ${andWhere} ORDER BY COALESCE("sortOrder", 0) ASC, "updatedAt" DESC`, qParams)).map((item) => normalizeTestCaseRow(item));
    case "bugs":
      return await selectAll(`SELECT "id", "company", "publicToken", "project", "module", "bugType", "title", "preconditions", "stepsToReproduce", "expectedResult", "actualResult", "severity", "priority", "status", "evidence", "relatedItems", "suggestedDev", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "Bug" WHERE "deletedAt" IS NULL ${andWhere} ORDER BY COALESCE("sortOrder", 0) ASC, "updatedAt" DESC`, qParams);
    case "tasks":
      return await selectAll(`SELECT "id", "company", "publicToken", "title", "project", "relatedFeature", "category", "status", "priority", "startDate", "endDate", "description", "acceptanceCriteria", "assignee", "evidence", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "Task" WHERE "deletedAt" IS NULL ${andWhere} ORDER BY COALESCE("sortOrder", 0) ASC, "updatedAt" DESC`, qParams);
    case "test-suites": {
      const suiteCompanyWhere = isAdmin ? "" : (scope.workspaceId ? ' AND ts."workspaceId" = ?' : ' AND ts."company" = ?');
      const tcCompanyWhere = isAdmin ? "" : (scope.workspaceId ? ' AND tc."workspaceId" = ?' : ' AND tc."company" = ?');
      return (await selectAll(
        `WITH case_stats AS (
          SELECT tc."testSuiteId" as suiteId,
            SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'passed' THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'blocked' THEN 1 ELSE 0 END) as blocked
          FROM "TestCase" tc
          WHERE tc."deletedAt" IS NULL${tcCompanyWhere}
          GROUP BY tc."testSuiteId"
        )
        SELECT ts.*, COALESCE(cs.passed, 0) as passed, COALESCE(cs.failed, 0) as failed, COALESCE(cs.blocked, 0) as blocked
         FROM "TestSuite" ts
          LEFT JOIN case_stats cs ON CAST(cs.suiteId AS INTEGER) = ts.id
         WHERE ts."deletedAt" IS NULL${suiteCompanyWhere} ORDER BY ts."updatedAt" DESC`,
        isAdmin ? [] : [...qParams, ...qParams]
      )).map((item) => ({
        ...normalizeTestSuiteRow(item),
        code: codeFromId("SUITE", Number(item.id)),
        passed: Number(item.passed ?? 0),
        failed: Number(item.failed ?? 0),
        blocked: Number(item.blocked ?? 0),
      }));
    }
    case "assignees":
      const assigneeRows = await selectAll(`SELECT u."id", u."name", u."role", u."email", COALESCE(a."skills", '') as "skills", 'active' as "status"
        FROM "User" u
        LEFT JOIN "Assignee" a ON a."userId" = u."id"
        WHERE u."deletedAt" IS NULL ${andWhere}
        ORDER BY u."name" ASC`, qParams);
      return assigneeRows
        .filter((item: Record<string, string | number | null>) => normalizeRole(String(item.role ?? "")) !== "admin")
        .map((item: Record<string, string | number | null>) => ({
          ...item,
          id: String(item.id),
        }));
    case "meeting-notes":
      return (await selectAll(`SELECT "id", "company", "title", "date", "project", "relatedItems", "summary", "actionItems", "publicToken", "createdAt", "updatedAt", "deletedAt" FROM "MeetingNote" WHERE "deletedAt" IS NULL ${andWhere} ORDER BY "date" DESC, "updatedAt" DESC`, qParams)).map((item) => ({
        ...item,
        code: codeFromId("MEET", Number(item.id)),
      }));
    case "users":
      return await selectAll(`SELECT id, name, email, role, company, "createdAt" FROM "User" ${where} ORDER BY "createdAt" DESC`, qParams);
    case "sprints": {
      const sprintWhere = isAdmin ? "" : (scope.workspaceId ? ' WHERE s."workspaceId" = ?' : ' WHERE s."company" = ?');
      const tpCompanyFilter = isAdmin ? "" : (scope.workspaceId ? ' AND tp2."workspaceId" = ?' : ' AND tp2."company" = ?');
      const sprintRows = await selectAll(`
        SELECT s.*,
          (SELECT tp2."title" || '|||' || tp2."project" FROM "TestPlan" tp2
            WHERE (LOWER(TRIM(tp2."sprint")) = LOWER(TRIM(s."name"))
              OR LOWER(TRIM(s."name")) LIKE LOWER(TRIM(tp2."sprint")) || '%'
              OR LOWER(TRIM(tp2."sprint")) LIKE LOWER(TRIM(s."name")) || '%')
            ${tpCompanyFilter}
            AND tp2."deletedAt" IS NULL
            ORDER BY tp2."updatedAt" DESC LIMIT 1) AS "_planInfo"
        FROM "Sprint" s
        ${sprintWhere}
        ORDER BY s."startDate" DESC
      `, isAdmin ? [] : [...qParams, ...qParams]);
      return sprintRows.map((row) => {
        const info = String(row._planInfo ?? "");
        const sep = info.indexOf("|||");
        const rest = { ...row };
        delete (rest as { _planInfo?: unknown })._planInfo;
        return {
          ...rest,
          testPlanTitle: sep >= 0 ? info.slice(0, sep) : (info || null),
          project: sep >= 0 ? info.slice(sep + 3) : null,
        };
      });
    }
    case "deployments":
      return (await selectAll(`SELECT "id", "company", "publicToken", "project", "date", "version", "environment", "developer", "changelog", "status", "notes", "createdAt", "updatedAt", "deletedAt" FROM "Deployment" ${where} ORDER BY "date" DESC, "createdAt" DESC`, qParams)).map(hydrateDeploymentNotes);
    case "work-logs": {
      const isWsAdmin = isWorkspaceAdmin(currentUser?.role);
      // Admin sees all company data, regular user sees only their own
      const userFilter = isAdmin || isWsAdmin ? "" : ' AND "assignee" = ?';
      const userParams = isAdmin || isWsAdmin ? [] : [String(currentUser?.name ?? "").trim()];
      return await selectAll(`SELECT "id", "company", "publicToken", "date", "startTime", "endTime", "category", "project", "description", "output", "notes", "assignee", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "WorkLog" WHERE "deletedAt" IS NULL ${andWhere}${userFilter} ORDER BY "date" DESC, "startTime" DESC`, [...qParams, ...userParams]);
    }
    default:
      return [];
  }
}

// Allowed sort columns per module (whitelist to prevent SQL injection)
const SORTABLE_COLUMNS: Record<string, string[]> = {
  "test-plans": ["title", "project", "sprint", "status", "startDate", "endDate", "updatedAt", "createdAt"],
  "test-sessions": ["project", "date", "tester", "result", "totalCases", "updatedAt", "createdAt"],
  "test-cases": ["caseName", "typeCase", "assignee", "status", "priority", "updatedAt", "createdAt"],
  "bugs": ["title", "project", "module", "bugType", "severity", "priority", "status", "suggestedDev", "updatedAt", "createdAt"],
  "tasks": ["title", "project", "category", "status", "priority", "assignee", "updatedAt", "createdAt"],
  "test-suites": ["title", "status", "updatedAt", "createdAt"],
  "assignees": ["name", "role", "email", "updatedAt", "createdAt"],
  "meeting-notes": ["title", "date", "project", "updatedAt", "createdAt"],
  "users": ["name", "email", "role", "createdAt"],
  "sprints": ["name", "status", "startDate", "endDate"],
  "deployments": ["project", "date", "version", "status", "updatedAt", "createdAt"],
  "work-logs": ["date", "startTime", "endTime", "category", "project", "assignee", "updatedAt", "createdAt"],
};

const DEFAULT_ORDER: Record<string, string> = {
  "test-plans": '"updatedAt" DESC',
  "test-sessions": '"updatedAt" DESC',
  "test-cases": 'CASE "status" WHEN \'Pending\' THEN 0 WHEN \'Passed\' THEN 1 WHEN \'Failed\' THEN 2 WHEN \'Blocked\' THEN 3 ELSE 4 END ASC, COALESCE("sortOrder", 0) ASC, "updatedAt" DESC',
  "bugs": 'CASE "status" WHEN \'open\' THEN 0 WHEN \'in_progress\' THEN 1 WHEN \'ready_to_retest\' THEN 2 WHEN \'closed\' THEN 3 WHEN \'rejected\' THEN 4 ELSE 5 END ASC, COALESCE("sortOrder", 0) ASC, "updatedAt" DESC',
  "tasks": 'CASE "status" WHEN \'todo\' THEN 0 WHEN \'doing\' THEN 1 WHEN \'review\' THEN 2 WHEN \'done\' THEN 3 WHEN \'blocked\' THEN 4 ELSE 5 END ASC, COALESCE("sortOrder", 0) ASC, "updatedAt" DESC',
  "test-suites": '"updatedAt" DESC',
  "assignees": '"updatedAt" DESC',
  "meeting-notes": '"date" DESC, "updatedAt" DESC',
  "users": '"createdAt" DESC',
  "sprints": '"startDate" DESC',
  "deployments": '"date" DESC, "createdAt" DESC',
  "work-logs": '"date" DESC, "startTime" DESC',
};

function buildOrderClause(module: string, sortBy?: string, sortDir?: "asc" | "desc"): string {
  if (!sortBy) return ` ORDER BY ${DEFAULT_ORDER[module] || '"updatedAt" DESC'}`;
  const allowed = SORTABLE_COLUMNS[module] || [];
  if (!allowed.includes(sortBy)) return ` ORDER BY ${DEFAULT_ORDER[module] || '"updatedAt" DESC'}`;
  const direction = sortDir === "asc" ? "ASC" : "DESC";
  return ` ORDER BY "${sortBy}" ${direction}`;
}

export async function getModuleRowsPage(module: ModuleKey, page: number, pageSize: number, search?: string, sortBy?: string, sortDir?: "asc" | "desc") {
  const currentUser = await getCurrentUser();
  const scope = getAccessScope(currentUser);
  const { company, isAdmin, andWhere, params: qParams } = scope;
  const safePage = Math.max(1, Math.floor(page || 1));
  const safeSize = Math.max(1, Math.floor(pageSize || 10));
  const offset = (safePage - 1) * safeSize;
  const limitClause = ` LIMIT ${safeSize} OFFSET ${offset}`;
  const { clause: searchClause, params: searchParams } = buildSearchClause(module, search ?? "", company);

  // Build dynamic ORDER BY clause
  const orderClause = buildOrderClause(module, sortBy, sortDir);

  switch (module) {
    case "test-plans": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "TestPlan" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = (await selectAll(`SELECT "id", "company", "publicToken", "title", "project", "sprint", "scope", "status", "startDate", "endDate", "notes", "assignee", "createdAt", "updatedAt", "deletedAt" FROM "TestPlan" WHERE "deletedAt" IS NULL ${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams])).map((item) => {
        const normalized = normalizeTestPlanRow(item);
        return {
          ...normalized,
          code: codeFromId("PLAN", Number(item.id)),
          publicToken: normalized.publicToken || "",
        };
      });
      return { rows, total };
    }
    case "test-sessions": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "TestSession" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = await selectAll(`SELECT "id", "company", "publicToken", "project", "date", "tester", "scope", "totalCases", "passed", "failed", "blocked", "result", "notes", "createdAt", "updatedAt", "deletedAt" FROM "TestSession" WHERE 1=1${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams]);
      return { rows, total };
    }
    case "test-cases": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "TestCase" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = (await selectAll(`SELECT "id", "company", "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", "assignee", "testStep", "expectedResult", "actualResult", "status", "evidence", "priority", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "TestCase" WHERE "deletedAt" IS NULL ${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams])).map((item) => normalizeTestCaseRow(item));
      return { rows, total };
    }
    case "bugs": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "Bug" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = await selectAll(`SELECT "id", "company", "publicToken", "project", "module", "bugType", "title", "preconditions", "stepsToReproduce", "expectedResult", "actualResult", "severity", "priority", "status", "evidence", "relatedItems", "suggestedDev", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "Bug" WHERE "deletedAt" IS NULL${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams]);
      return { rows, total };
    }
    case "tasks": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "Task" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = await selectAll(`SELECT "id", "company", "publicToken", "title", "project", "relatedFeature", "category", "status", "priority", "startDate", "endDate", "description", "acceptanceCriteria", "assignee", "evidence", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "Task" WHERE "deletedAt" IS NULL${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams]);
      return { rows, total };
    }
    case "test-suites": {
      const suiteCompanyWhere = isAdmin ? "" : (scope.workspaceId ? ' AND ts."workspaceId" = ?' : ' AND ts."company" = ?');
      const tcCompanyWhere = isAdmin ? "" : (scope.workspaceId ? ' AND tc."workspaceId" = ?' : ' AND tc."company" = ?');
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "TestSuite" ts WHERE ts."deletedAt" IS NULL${suiteCompanyWhere}${searchClause}`, [...(isAdmin ? [] : qParams), ...searchParams]) as { total?: number } | undefined;
      const rows = (await selectAll(
        `WITH case_stats AS (
          SELECT tc."testSuiteId" as suiteId,
            SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'passed' THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'blocked' THEN 1 ELSE 0 END) as blocked
          FROM "TestCase" tc
          WHERE tc."deletedAt" IS NULL${tcCompanyWhere}
          GROUP BY tc."testSuiteId"
        )
        SELECT ts.*, COALESCE(cs.passed, 0) as passed, COALESCE(cs.failed, 0) as failed, COALESCE(cs.blocked, 0) as blocked
         FROM "TestSuite" ts
          LEFT JOIN case_stats cs ON CAST(cs.suiteId AS INTEGER) = ts.id
         WHERE ts."deletedAt" IS NULL${suiteCompanyWhere}${searchClause}${orderClause}${limitClause}`,
        isAdmin ? [...searchParams] : [...qParams, ...qParams, ...searchParams]
      )).map((item) => ({
        ...normalizeTestSuiteRow(item),
        code: codeFromId("SUITE", Number(item.id)),
        passed: Number(item.passed ?? 0),
        failed: Number(item.failed ?? 0),
        blocked: Number(item.blocked ?? 0),
      }));
      return { rows, total: Number(totalRow?.total ?? 0) };
    }
    case "assignees": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "User" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = await selectAll(`SELECT id, name, role, email, '' as skills, 'active' as status, "createdAt", "updatedAt"
        FROM "User" WHERE "deletedAt" IS NULL ${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams]);
      return { rows, total };
    }
    case "meeting-notes": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "MeetingNote" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = (await selectAll(`SELECT "id", "company", "title", "date", "project", "relatedItems", "summary", "actionItems", "publicToken", "createdAt", "updatedAt", "deletedAt" FROM "MeetingNote" WHERE "deletedAt" IS NULL ${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams])).map((item) => ({
        ...item,
        code: codeFromId("MEET", Number(item.id)),
      }));
      return { rows, total };
    }
    case "users": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "User" WHERE 1=1${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = await selectAll(`SELECT id, name, email, role, company, "createdAt" FROM "User" WHERE 1=1${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams]);
      return { rows, total };
    }
    case "sprints": {
      const sprintWhere = isAdmin ? "" : (scope.workspaceId ? ' WHERE s."workspaceId" = ?' : ' WHERE s."company" = ?');
      const sprintAndWhere = isAdmin ? "" : (scope.workspaceId ? ' AND s."workspaceId" = ?' : ' AND s."company" = ?');
      const tpCompanyFilter = isAdmin ? "" : (scope.workspaceId ? ' AND tp2."workspaceId" = ?' : ' AND tp2."company" = ?');
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "Sprint" s WHERE s."deletedAt" IS NULL${sprintAndWhere}${searchClause}`, [...(isAdmin ? [] : qParams), ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const sprintRows = await selectAll(`
        SELECT s.*,
          (SELECT tp2."title" || '|||' || tp2."project" FROM "TestPlan" tp2
            WHERE (LOWER(TRIM(tp2."sprint")) = LOWER(TRIM(s."name"))
              OR LOWER(TRIM(s."name")) LIKE LOWER(TRIM(tp2."sprint")) || '%'
              OR LOWER(TRIM(tp2."sprint")) LIKE LOWER(TRIM(s."name")) || '%')
            ${tpCompanyFilter}
            AND tp2."deletedAt" IS NULL
            ORDER BY tp2."updatedAt" DESC LIMIT 1) AS "_planInfo"
        FROM "Sprint" s
        ${sprintWhere}${isAdmin ? ' WHERE s."deletedAt" IS NULL' : ' AND s."deletedAt" IS NULL'}${searchClause}
        ${sortBy ? orderClause : ' ORDER BY s."startDate" DESC'}${limitClause}
      `, [...(isAdmin ? [] : [...qParams, ...qParams]), ...searchParams]);
      const rows = sprintRows.map((row) => {
        const info = String(row._planInfo ?? "");
        const sep = info.indexOf("|||");
        const rest = { ...row };
        delete (rest as { _planInfo?: unknown })._planInfo;
        return {
          ...rest,
          testPlanTitle: sep >= 0 ? info.slice(0, sep) : (info || null),
          project: sep >= 0 ? info.slice(sep + 3) : null,
        };
      });
      return { rows, total };
    }
    case "deployments": {
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "Deployment" WHERE "deletedAt" IS NULL${andWhere}${searchClause}`, [...qParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = (await selectAll(`SELECT "id", "company", "publicToken", "project", "date", "version", "environment", "developer", "changelog", "status", "notes", "createdAt", "updatedAt", "deletedAt" FROM "Deployment" WHERE "deletedAt" IS NULL ${andWhere}${searchClause}${orderClause}${limitClause}`, [...qParams, ...searchParams])).map(hydrateDeploymentNotes);
      return { rows, total };
    }
    case "work-logs": {
      const isWsAdmin = isWorkspaceAdmin(currentUser?.role);
      // Admin sees all company data, regular user sees only their own
      const userFilter = isAdmin || isWsAdmin ? "" : ' AND "assignee" = ?';
      const userParams = isAdmin || isWsAdmin ? [] : [String(currentUser?.name ?? "").trim()];
      const totalRow = await db.get(`SELECT COUNT(*) as total FROM "WorkLog" WHERE "deletedAt" IS NULL${andWhere}${userFilter}${searchClause}`, [...qParams, ...userParams, ...searchParams]) as { total?: number } | undefined;
      const total = Number(totalRow?.total ?? 0);
      const rows = await selectAll(`SELECT "id", "company", "publicToken", "date", "startTime", "endTime", "category", "project", "description", "output", "notes", "assignee", "sortOrder", "createdAt", "updatedAt", "deletedAt" FROM "WorkLog" WHERE "deletedAt" IS NULL ${andWhere}${userFilter}${searchClause}${orderClause}${limitClause}`, [...qParams, ...userParams, ...searchParams]);
      return { rows, total };
    }
    default:
      return { rows: [], total: 0 };
  }
}

