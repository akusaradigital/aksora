import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ModuleKey } from "@/lib/modules";
import { shouldIndexModule, syncSearchTokens } from "@/lib/search-index";
import { propagateNameChange, syncAssigneeFromUser } from "@/lib/user-assignee-sync";
import { generateDeploymentNotes } from "@/lib/deployment-notes";
import { generateTestPlanNotes } from "@/lib/test-plan-notes";
import {
  getAccessScope,
  logActivity,
  syncSprintFromTestPlan,
} from "@/lib/data-helpers";
import { invalidateDashboardCache } from "@/lib/data/data-dashboard-stats";

type ModuleData = Record<string, unknown>;

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

export async function updateModuleRecord(module: ModuleKey, id: string | number, data: ModuleData) {
  const currentUser = await getCurrentUser();
  const scope = getAccessScope(currentUser);
  const { company, andWhere: companyFilter, params: companyParam } = scope;
  const actor = currentUser?.name || currentUser?.email || "";

  // Sanitize: prevent literal "undefined"/"null" strings (from String(undefined)) being
  // stored. Genuine undefined/null are left alone so downstream `?? default` /
  // `|| fallback` expressions in the params fire their defaults.
  for (const key of Object.keys(data)) {
    if (data[key] === "undefined" || data[key] === "null") {
      data[key] = "";
    }
  }

  switch (module) {
    case "tasks": {
      const res = await db.run(
        `UPDATE "Task"
         SET "title" = ?, "project" = ?, "relatedFeature" = ?, "category" = ?, "status" = ?, "priority" = ?, "startDate" = ?, "endDate" = ?, "description" = ?, "acceptanceCriteria" = ?, "notes" = ?, "evidence" = ?, "relatedItems" = ?, "assignee" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.title, data.project, data.relatedFeature, data.category, data.status, data.priority, data.startDate ?? "", data.endDate ?? "", data.description, data.acceptanceCriteria ?? "", data.notes ?? "", data.evidence ?? "", data.relatedItems ?? "", data.assignee ?? "", id, ...companyParam]
      );
      await logActivity(company, "Task", String(data.title), "Updated", `Task ${data.title} updated to ${data.status}`, actor);
      invalidateDashboardCache(company);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "Task" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("tasks", company, String(id), updatedRow);
      }
      return res;
    }
    case "bugs": {
      const res = await db.run(
        `UPDATE "Bug"
         SET "project" = ?, "module" = ?, "bugType" = ?, "title" = ?, "preconditions" = ?, "stepsToReproduce" = ?, "expectedResult" = ?, "actualResult" = ?, "severity" = ?, "priority" = ?, "status" = ?, "suggestedDev" = ?, "relatedItems" = ?, "evidence" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.project, data.module, data.bugType, data.title, data.preconditions, data.stepsToReproduce, data.expectedResult, data.actualResult, data.severity, data.priority, data.status, data.suggestedDev ?? "", data.relatedItems ?? "", data.evidence, id, ...companyParam]
      );
      await logActivity(company, "Bug", String(data.title), "Updated", `Bug ${data.title} marked as ${data.status}`, actor);
      invalidateDashboardCache(company);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "Bug" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("bugs", company, String(id), updatedRow);
      }
      return res;
    }
    case "test-plans": {
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
      const res = await db.run(
        `UPDATE "TestPlan"
         SET "title" = ?, "project" = ?, "sprint" = ?, "scope" = ?, "startDate" = ?, "endDate" = ?, "status" = ?, "notes" = ?, "assignee" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.title, data.project, data.sprint, data.scope, data.startDate, data.endDate, data.status, notes, data.assignee ?? "", id, ...companyParam]
      );
      await logActivity(company, "TestPlan", String(data.title), "Updated", `Plan ${data.title} revised`, actor);
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
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "TestPlan" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("test-plans", company, String(id), updatedRow);
      }
      return res;
    }
    case "test-sessions": {
      const res = await db.run(
        `UPDATE "TestSession"
         SET "date" = ?, "project" = ?, "sprint" = ?, "tester" = ?, "scope" = ?, "totalCases" = ?, "passed" = ?, "failed" = ?, "blocked" = ?, "result" = ?, "notes" = ?, "evidence" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.date, data.project, data.sprint, data.tester, data.scope, data.totalCases, data.passed, data.failed, data.blocked, data.result, data.notes, data.evidence, id, ...companyParam]
      );
      await logActivity(company, "Session", String(data.date), "Updated", `Test session results updated`, actor);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "TestSession" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("test-sessions", company, String(id), updatedRow);
      }
      return res;
    }
    case "test-cases": {
      const res = await db.run(
        `UPDATE "TestCase"
         SET "testSuiteId" = ?, "tcId" = ?, "typeCase" = ?, "preCondition" = ?, "caseName" = ?, "assignee" = ?, "testStep" = ?, "expectedResult" = ?, "actualResult" = ?, "status" = ?, "evidence" = ?, "priority" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.testSuiteId, data.tcId, data.typeCase, data.preCondition, data.caseName, data.assignee ?? "", data.testStep, data.expectedResult, data.actualResult ?? "", data.status, data.evidence ?? "", data.priority ?? "Medium", id, ...companyParam]
      );
      await logActivity(company, "TestCase", String(data.caseName), "Updated", `Test case ${data.caseName} updated`, actor);
      invalidateDashboardCache(company);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "TestCase" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("test-cases", company, String(id), updatedRow);
      }
      return res;
    }
    case "test-suites": {
      const suitePlanId = textOrEmpty(data.testPlanId);
      const res = await db.run(
        `UPDATE "TestSuite"
         SET "testPlanId" = ?, "title" = ?, "assignee" = ?, "status" = ?, "notes" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [suitePlanId, data.title, data.assignee ?? "", data.status, data.notes, id, ...companyParam]
      );
      await logActivity(company, "TestSuite", String(data.title), "Updated", `Suite ${data.title} updated`, actor);
      invalidateDashboardCache(company);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "TestSuite" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("test-suites", company, String(id), updatedRow);
      }
      return res;
    }
    case "assignees": {
      const res = await db.run(
        `UPDATE "Assignee"
         SET "name" = ?, "role" = ?, "email" = ?, "skills" = ?, "status" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.name, data.role ?? "", data.email ?? "", data.skills ?? "", data.status, id, ...companyParam]
      );
      await logActivity(company, "Assignee", String(data.name), "Updated", `Profile for ${data.name} updated`, actor);
      invalidateDashboardCache(company);
      return res;
    }
    case "users": {
      const email = text(data.email);
      const name = text(data.name);
      const role = text(data.role);
      const password = text(data.password);
      const existingEmail = await db.get<{ id: number }>('SELECT "id" FROM "User" WHERE "email" = ? AND "id" != CAST(? AS INTEGER)', [email, id]);
      if (existingEmail) {
        throw new Error("Email address is already registered. Please use a different email.");
      }
      // Get old name before update for propagation
      const oldUserRow = await db.get<{ name: string | null; email: string | null }>('SELECT "name", "email" FROM "User" WHERE "id" = CAST(? AS INTEGER)', [id]);
      const oldName = text(oldUserRow?.name || oldUserRow?.email).trim();
      const newName = text(name || email).trim();

      const { hashPassword } = await import("@/lib/auth-core");
      if (password) {
        const hashedPassword = await hashPassword(password);
        const res = await db.run(
          `UPDATE "User" SET "name" = ?, "email" = ?, "role" = ?, "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
          [name, email, role, hashedPassword, id, ...companyParam]
        );
        const updatedUser = { id: Number(id), company, name, email, role };
        await syncAssigneeFromUser(updatedUser);
        if (oldName && newName && oldName !== newName) {
          await propagateNameChange(company, oldName, newName);
        }
        await syncSearchIndex("users", company, updatedUser.id, updatedUser);
        await syncSearchIndex("assignees", company, updatedUser.id, { ...updatedUser, status: "active" });
        await logActivity(company, "User", email, "Updated", `Security settings for ${email} updated`, actor);
        invalidateDashboardCache(company);
        return res;
      } else {
        const res = await db.run(
          `UPDATE "User" SET "name" = ?, "email" = ?, "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
          [name, email, role, id, ...companyParam]
        );
        const updatedUser = { id: Number(id), company, name, email, role };
        await syncAssigneeFromUser(updatedUser);
        if (oldName && newName && oldName !== newName) {
          await propagateNameChange(company, oldName, newName);
        }
        await syncSearchIndex("users", company, updatedUser.id, updatedUser);
        await syncSearchIndex("assignees", company, updatedUser.id, { ...updatedUser, status: "active" });
        await logActivity(company, "User", email, "Updated", `User info for ${email} updated`, actor);
        invalidateDashboardCache(company);
        return res;
      }
    }
    case "sprints": {
      const res = await db.run(
        `UPDATE "Sprint"
         SET "name" = ?, "startDate" = ?, "endDate" = ?, "status" = ?, "goal" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.name, data.startDate, data.endDate, data.status, data.goal ?? "", id, ...companyParam]
      );
      await logActivity(company, "Sprint", String(data.name), "Updated", `Sprint ${data.name} updated to ${data.status}`, actor);
      invalidateDashboardCache(company);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "Sprint" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("sprints", company, String(id), updatedRow);
      }
      return res;
    }
    case "meeting-notes": {
      const res = await db.run(
        `UPDATE "MeetingNote"
         SET "date" = ?, "project" = ?, "title" = ?, "attendees" = ?, "content" = ?, "summary" = ?, "actionItems" = ?, "relatedItems" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.date, data.project, data.title, data.attendees ?? "", data.content ?? "", data.content ?? "", data.actionItems ?? "", data.relatedItems ?? "", id, ...companyParam]
      );
      await logActivity(company, "MeetingNote", String(data.title), "Updated", `Meeting notes for ${data.title} revised`, actor);
      invalidateDashboardCache(company);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "MeetingNote" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("meeting-notes", company, String(id), updatedRow);
      }
      return res;
    }
    case "deployments": {
      const notes = generateDeploymentNotes(text(data.changelog));
      const env = textOrEmpty(data.environment);
      const dev = textOrEmpty(data.developer);
      const res = await db.run(
        `UPDATE "Deployment"
         SET "date" = ?, "version" = ?, "project" = ?, "environment" = ?, "developer" = ?, "changelog" = ?, "status" = ?, "notes" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.date, data.version, data.project, env, dev, data.changelog ?? "", data.status, notes, id, ...companyParam]
      );
      await logActivity(company, "Deployment", String(data.version), "Updated", `Deployment ${data.version} updated to ${data.status}`, actor);
      invalidateDashboardCache(company);
      const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "Deployment" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
      if (updatedRow) {
        await syncSearchIndex("deployments", company, String(id), updatedRow);
      }
      return res;
    }
    case "work-logs": {
      const assignee = textOrEmpty(data.assignee) || actor;
      const res = await db.run(
        `UPDATE "WorkLog"
         SET "date" = ?, "startTime" = ?, "endTime" = ?, "category" = ?, "project" = ?, "description" = ?, "output" = ?, "notes" = ?, "assignee" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
        [data.date, data.startTime, data.endTime, data.category, data.project, data.description, data.output ?? "", data.notes ?? "", assignee, id, ...companyParam]
      );
      await logActivity(company, "WorkLog", text(data.date), "Updated", `Work log updated: ${data.startTime}-${data.endTime} ${data.category}`, actor);
      invalidateDashboardCache(company);
      return res;
    }
    default:
      return null;
  }
}
