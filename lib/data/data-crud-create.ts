import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ModuleKey } from "@/lib/modules";
import { shouldIndexModule, syncSearchTokens } from "@/lib/search-index";
import { syncAssigneeFromUser } from "@/lib/user-assignee-sync";
import { generateDeploymentNotes } from "@/lib/deployment-notes";
import { generateTestPlanNotes } from "@/lib/test-plan-notes";
import {
  getWriteCompany,
  logActivity,
  makePublicToken,
  runInsert,
  syncSprintFromTestPlan,
} from "@/lib/data-helpers";
import { invalidateDashboardCache } from "@/lib/data/data-dashboard-stats";

type ModuleData = Record<string, unknown> & {
  company?: unknown;
};

function text(value: unknown) {
  return String(value ?? "");
}

function textOrEmpty(value: unknown) {
  const valueText = text(value).trim();
  return valueText === "undefined" || valueText === "null" ? "" : valueText;
}

async function syncSearchIndex(module: ModuleKey, company: string, entityId: string | number, data: Record<string, unknown>) {
  if (!shouldIndexModule(module)) return;
  try {
    await syncSearchTokens(module, company, entityId, data);
  } catch (e) {
    console.warn(`syncSearchIndex failed for ${module}/${entityId} (non-critical):`, e);
  }
}

export async function createModuleRecord(module: ModuleKey, data: ModuleData) {
  const user = await getCurrentUser();
  const company = getWriteCompany(user, text(data.company));
  const actor = user?.name || user?.email || "";

  // Sanitize: prevent literal "undefined"/"null" strings (from String(undefined)) being
  // stored. Genuine undefined/null values are left alone so downstream `?? default` /
  // `|| fallback` expressions in the insert lines still fire their defaults.
  for (const key of Object.keys(data)) {
    if (data[key] === "undefined" || data[key] === "null") {
      data[key] = "";
    }
  }

  switch (module) {
    case "test-plans": {
      const publicToken = textOrEmpty(data.publicToken) || makePublicToken();
      const notesInput = textOrEmpty(data.notes);
      const notes = notesInput ? notesInput : generateTestPlanNotes({
        title: text(data.title),
        project: text(data.project),
        sprint: text(data.sprint),
        status: text(data.status),
        startDate: text(data.startDate),
        endDate: text(data.endDate),
        scope: text(data.scope),
        assignee: text(data.assignee),
      });
      const res = await runInsert(
        `INSERT INTO "TestPlan" ("company", "publicToken", "title", "project", "sprint", "scope", "status", "startDate", "endDate", "notes", "assignee")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.title, data.project, data.sprint, data.scope, data.status, data.startDate, data.endDate, notes, data.assignee ?? ""]
      );
      await logActivity(company, "TestPlan", String(data.title), "Created", `New test plan: ${data.title}`, actor, publicToken);
      invalidateDashboardCache(company);
      try {
        await syncSprintFromTestPlan({
          company,
          sprintName: textOrEmpty(data.sprint) || undefined,
          startDate: textOrEmpty(data.startDate) || undefined,
          endDate: textOrEmpty(data.endDate) || undefined,
          goal: textOrEmpty(data.title) || undefined,
        });
      } catch (e) {
        console.warn("syncSprintFromTestPlan failed (non-critical):", e);
      }
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "TestPlan" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("test-plans", company, Number(created.id), data);
      }
      return res;
    }
    case "test-cases": {
      const publicToken = textOrEmpty(data.publicToken) || makePublicToken();
      const res = await runInsert(
        `INSERT INTO "TestCase" ("company", "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", "assignee", "testStep", "expectedResult", "actualResult", "status", "evidence", "priority")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.testSuiteId, data.tcId, data.typeCase, data.preCondition, data.caseName, data.assignee ?? "", data.testStep, data.expectedResult, data.actualResult ?? "", data.status, data.evidence ?? "", data.priority ?? "Medium"]
      );
      await logActivity(company, "TestCase", String(data.tcId), "Created", `Added test case: ${data.tcId} - ${data.caseName}`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "TestCase" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("test-cases", company, Number(created.id), data);
      }
      return res;
    }
    case "bugs": {
      const publicToken = makePublicToken();
      const lastDevRes = await db.get<{ suggestedDev?: string }>('SELECT "suggestedDev" FROM "Bug" WHERE "module" = ? AND "company" = ? ORDER BY "id" DESC LIMIT 1', [data.module, company]);
      const suggestedDev = textOrEmpty(data.suggestedDev) || lastDevRes?.suggestedDev || "";
      const res = await runInsert(
        `INSERT INTO "Bug" ("company", "publicToken", "project", "module", "bugType", "title", "preconditions", "stepsToReproduce", "expectedResult", "actualResult", "severity", "priority", "status", "evidence", "relatedItems", "suggestedDev")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.project, data.module, data.bugType, data.title, data.preconditions, data.stepsToReproduce, data.expectedResult, data.actualResult, data.severity, data.priority, data.status, data.evidence, data.relatedItems, suggestedDev],
      );
      await logActivity(company, "Bug", String(data.title), "Created", `New bug recorded: ${data.title}`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "Bug" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("bugs", company, Number(created.id), data);
      }
      return res;
    }
    case "tasks": {
      const publicToken = makePublicToken();
      const res = await runInsert(
        `INSERT INTO "Task" ("company", "publicToken", "title", "project", "relatedFeature", "category", "status", "priority", "startDate", "endDate", "description", "acceptanceCriteria", "notes", "evidence", "relatedItems", "assignee")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.title, data.project, data.relatedFeature, data.category, data.status, data.priority, data.startDate ?? "", data.endDate ?? "", data.description, data.acceptanceCriteria, data.notes, data.evidence, data.relatedItems, data.assignee ?? ""],
      );
      await logActivity(company, "Task", String(data.title), "Created", `New task assigned: ${data.title}`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "Task" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("tasks", company, Number(created.id), data);
      }
      return res;
    }
    case "test-sessions": {
      const publicToken = makePublicToken();
      const res = await runInsert(
        `INSERT INTO "TestSession" ("company", "publicToken", "date", "project", "sprint", "tester", "scope", "totalCases", "passed", "failed", "blocked", "result", "notes", "evidence")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.date, data.project, data.sprint, data.tester, data.scope, data.totalCases, data.passed, data.failed, data.blocked, data.result, data.notes, data.evidence]
      );
      await logActivity(company, "Session", text(data.date), "Executed", `Test execution session by ${data.tester} (${data.result})`, actor, publicToken);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "TestSession" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("test-sessions", company, Number(created.id), data);
      }
      return res;
    }
    case "test-suites": {
      const publicToken = textOrEmpty(data.publicToken) || makePublicToken();
      const res = await runInsert(
        `INSERT INTO "TestSuite" ("company", "publicToken", "testPlanId", "title", "assignee", "status", "notes")
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.testPlanId, data.title, data.assignee ?? "", data.status, data.notes ?? ""]
      );
      await logActivity(company, "TestSuite", String(data.title), "Created", `Suite created: ${data.title}`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "TestSuite" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("test-suites", company, Number(created.id), data);
      }
      return res;
    }
    case "assignees": {
      const res = await runInsert(
        `INSERT INTO "Assignee" ("company", "name", "role", "email", "skills", "status")
         VALUES (?, ?, ?, ?, ?, ?)`,
        [company, data.name, data.role ?? "", data.email ?? "", data.skills ?? "", data.status]
      );
      await logActivity(company, "Assignee", String(data.name), "Added", `New team member: ${data.name}`, actor);
      invalidateDashboardCache(company);
      return res;
    }
    case "users": {
      const existing = await db.get<{ id: number }>('SELECT "id" FROM "User" WHERE "email" = ?', [data.email]);
      if (existing) {
        throw new Error("Email address is already registered. Please use a different email.");
      }
      const { hashPassword } = await import("@/lib/auth-core");
      const hashedPassword = await hashPassword(text(data.password) || "password123");
      const res = await runInsert(
        `INSERT INTO "User" ("company", "name", "email", "password", "role")
         VALUES (?, ?, ?, ?, ?)`,
        [company, data.name || data.email, data.email, hashedPassword, data.role || "user"]
      );
      const user2 = await db.get<{ id: number; company: string; name: string | null; email: string | null; role: string | null }>(
        'SELECT "id", "company", "name", "email", "role" FROM "User" WHERE "email" = ?',
        [data.email],
      );
      if (user2) {
        await syncAssigneeFromUser(user2);
        await syncSearchIndex("users", company, user2.id, user2);
        await syncSearchIndex("assignees", company, user2.id, { ...user2, status: "active" });
      }
      await logActivity(company, "User", String(data.email), "Created", `Access granted for ${data.email}`, actor);
      invalidateDashboardCache(company);
      return res;
    }
    case "sprints": {
      const existingSprint = await db.get<{ id: number }>(
        `SELECT "id" FROM "Sprint" WHERE LOWER(TRIM("name")) = LOWER(TRIM(?)) AND "company" = ? AND "deletedAt" IS NULL`,
        [data.name, company],
      );
      if (existingSprint) {
        throw new Error("A sprint with this name already exists. Please use a different name.");
      }
      const publicToken = makePublicToken();
      const res = await runInsert(
        `INSERT INTO "Sprint" ("company", "publicToken", "name", "startDate", "endDate", "status", "goal")
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.name, data.startDate, data.endDate, data.status, data.goal ?? ""]
      );
      await logActivity(company, "Sprint", String(data.name), "Created", `Sprint ${data.name} started`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "Sprint" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("sprints", company, Number(created.id), data);
      }
      return res;
    }
    case "meeting-notes": {
      const publicToken = textOrEmpty(data.publicToken) || makePublicToken();
      const res = await runInsert(
        `INSERT INTO "MeetingNote" ("company", "publicToken", "date", "project", "title", "attendees", "content", "summary", "actionItems", "relatedItems")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.date || new Date().toISOString(), data.project, data.title, data.attendees ?? "", data.content ?? "", data.content ?? "", data.actionItems ?? "", data.relatedItems ?? ""]
      );
      await logActivity(company, "MeetingNote", String(data.title), "Created", `Notes recorded for: ${data.title}`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "MeetingNote" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("meeting-notes", company, Number(created.id), data);
      }
      return res;
    }
    case "deployments": {
      const publicToken = makePublicToken();
      const notes = generateDeploymentNotes(text(data.changelog));
      const env = textOrEmpty(data.environment);
      const dev = textOrEmpty(data.developer);
      const res = await runInsert(
        `INSERT INTO "Deployment" ("company", "publicToken", "date", "version", "project", "environment", "developer", "changelog", "status", "notes")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.date, data.version, data.project, env, dev, data.changelog ?? "", data.status, notes]
      );
      await logActivity(company, "Deployment", String(data.version), "Deployed", `Deployment ${data.version} to ${env || "N/A"}: ${data.status}`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "Deployment" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("deployments", company, Number(created.id), data);
      }
      return res;
    }
    case "work-logs": {
      const publicToken = makePublicToken();
      const assignee = data.assignee || actor;
      const res = await runInsert(
        `INSERT INTO "WorkLog" ("company", "publicToken", "date", "startTime", "endTime", "category", "project", "description", "output", "notes", "assignee")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, publicToken, data.date, data.startTime, data.endTime, data.category, data.project, data.description, data.output ?? "", data.notes ?? "", assignee]
      );
      await logActivity(company, "WorkLog", String(data.date), "Created", `Work log: ${data.startTime}-${data.endTime} ${data.category} (${data.project})`, actor, publicToken);
      invalidateDashboardCache(company);
      const created = await db.get<{ id?: number | string }>(`SELECT "id" FROM "WorkLog" WHERE "company" = ? AND "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [company, publicToken]);
      if (created?.id !== undefined) {
        await syncSearchIndex("work-logs", company, Number(created.id), data);
      }
      return res;
    }
    default:
      return null;
  }
}
