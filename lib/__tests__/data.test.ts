import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    run: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    exec: vi.fn(),
    transaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
  getCurrentUser: vi.fn(),
  isPlatformSuperAdmin: vi.fn((role: string | null | undefined, company: string | null | undefined) => {
    const normalizedRole = String(role ?? "").trim().toLowerCase();
    return normalizedRole === "admin" && !String(company ?? "").trim();
  }),
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
  isPostgres: false,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth-core", () => ({
  isPlatformSuperAdmin: mocks.isPlatformSuperAdmin,
  hashPassword: mocks.hashPassword,
}));

import {
  clearModuleRecords,
  createModuleRecord,
  getTableName,
  getModuleRows,
  deleteModuleRecord,
  getTestPlanByToken,
  getTestPlanById,
  getTestSuitesByPlanId,
  getTestSuite,
  getTestCasesByIdStrings,
  getTestSuiteByToken,
  getTestCasesByScenario,
  getTestCasesByScenarioIds,
  getAllTestCasesWithSuite,
  getProjectData,
  getDashboardData,
  getReportsData,
  getReleaseNotes,
  getQualityTrend,
  getExecutiveData,
  getResourceDetails,
  makePublicToken,
  normalizeTestCaseRow,
  normalizeTestPlanRow,
  normalizeTestSuiteRow,
  updateModuleRecord,
  updateModuleStatus,
} from "@/lib/data";
import { moduleOrder } from "@/lib/modules";

beforeEach(() => {
  mocks.db.run.mockReset();
  mocks.db.get.mockReset();
  mocks.db.query.mockReset();
  mocks.db.exec.mockReset();
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ company: "acme", role: "pm" });
  mocks.db.run.mockResolvedValue({ changes: 1 });
  mocks.db.get.mockResolvedValue(undefined);
  mocks.db.query.mockResolvedValue([]);
  mocks.db.exec.mockResolvedValue(undefined);
});

describe("data helpers", () => {
  it("maps module keys to tables", () => {
    const expected = {
      tasks: "Task",
      bugs: "Bug",
      "test-cases": "TestCase",
      "test-plans": "TestPlan",
      "test-sessions": "TestSession",
      "test-suites": "TestSuite",
      assignees: "Assignee",
      "meeting-notes": "MeetingNote",
      sprints: "Sprint",
      users: "User",
      deployments: "Deployment",
      "work-logs": "WorkLog",
    } as const;

    for (const key of moduleOrder) {
      expect(getTableName(key)).toBe(expected[key]);
    }
  });

  it("normalizes row variants used by the app", () => {
    expect(
      normalizeTestPlanRow({ id: 12, code: "  ", publicToken: null, assignee: 99 }),
    ).toMatchObject({
      id: "12",
      code: "",
      publicToken: "",
      assignee: "99",
    });

    expect(
      normalizeTestSuiteRow({ id: 8, testPlanId: 4, title: "Suite", status: null, publicToken: undefined }),
    ).toMatchObject({
      id: "8",
      testPlanId: "4",
      title: "Suite",
      status: "",
      publicToken: "",
    });

    expect(
      normalizeTestCaseRow({ id: "3", testSuiteId: 7, publicToken: null, priority: undefined, evidence: null, status: undefined }),
    ).toMatchObject({
      id: 3,
      testSuiteId: "7",
      publicToken: "",
      priority: "Medium",
      evidence: "",
      status: "Pending",
    });
  });

  it("generates a stable public token", () => {
    const token = makePublicToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(0);
  });
});

describe("module data access", () => {
  it("loads token-based plan and suite data", async () => {
    mocks.db.get
      .mockResolvedValueOnce({
        id: 10,
        title: "Plan A",
        project: "QA Hub",
        publicToken: "plan-token",
        assignee: "Rina",
      })
      .mockResolvedValueOnce({
        id: 10,
        title: "Plan A",
        project: "QA Hub",
        publicToken: "plan-token",
        assignee: "Rina",
      })
      .mockResolvedValueOnce({
        id: "20",
        title: "Suite A",
        testPlanId: "10",
        publicToken: "suite-token",
        status: "active",
      })
      .mockResolvedValueOnce({
        id: 20,
        title: "Suite A",
        testPlanId: "10",
        publicToken: "suite-token",
        status: "active",
      });
    mocks.db.query
      .mockResolvedValueOnce([
        { id: 1, testPlanId: "10", title: "Suite A", status: "active", publicToken: "suite-token" },
      ])
      .mockResolvedValueOnce([
        { id: 2, testSuiteId: "20", tcId: "TC-2", caseName: "Case 2", status: "Passed", priority: "High", publicToken: "case-token" },
      ])
      .mockResolvedValueOnce([
        { id: 2, testSuiteId: "20", tcId: "TC-2", caseName: "Case 2", status: "Passed", priority: "High", publicToken: "case-token" },
      ])
      .mockResolvedValueOnce([
        { id: 2, testSuiteId: "20", tcId: "TC-2", caseName: "Case 2", status: "Passed", priority: "High", publicToken: "case-token" },
      ]);

    expect(await getTestPlanByToken("plan-token")).toMatchObject({
      id: "10",
      title: "Plan A",
      publicToken: "plan-token",
      assignee: "Rina",
    });
    expect(await getTestPlanById("10")).toMatchObject({
      id: "10",
      title: "Plan A",
      publicToken: "plan-token",
    });
    expect(await getTestSuiteByToken("suite-token")).toMatchObject({
      id: "20",
      title: "Suite A",
      testPlanId: "10",
      publicToken: "suite-token",
    });
    expect(await getTestSuitesByPlanId("10")).toMatchObject([
      { id: "1", title: "Suite A", publicToken: "suite-token" },
    ]);
    expect(await getTestSuite("20")).toMatchObject({
      code: "SUITE-020",
    });
    expect(await getTestCasesByIdStrings("20")).toMatchObject([
      { id: 2, code: "TC-002", tcId: "TC-2" },
    ]);
    expect(await getTestCasesByScenario("20")).toMatchObject([
      { id: 2, testSuiteId: "20", tcId: "TC-2" },
    ]);
    expect(await getTestCasesByScenarioIds(["20"])).toMatchObject({
      "20": [{ id: 2, testSuiteId: "20", tcId: "TC-2", code: "TC-002" }],
    });
  });

  it("creates and updates tasks with activity logs", async () => {
    await createModuleRecord("tasks", {
      title: "Task 1",
      project: "QA Hub",
      relatedFeature: "Login",
      category: "Testing",
      status: "todo",
      priority: "P1",
      startDate: "2026-05-01",
      endDate: "2026-05-01",
      description: "desc",
      notes: "notes",
      evidence: "",
      relatedItems: "",
      assignee: "Rina",
    });

    expect(mocks.db.run.mock.calls[0][0]).toContain('INSERT INTO "Task"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "Task" && params?.[3] === "Task 1" && params?.[4] === "Created")).toBe(true);

    vi.clearAllMocks();
    mocks.db.run.mockResolvedValueOnce({ changes: 1 });

    await updateModuleRecord("tasks", 4, {
      title: "Task 1",
      project: "QA Hub",
      relatedFeature: "Login",
      category: "Testing",
      status: "done",
      priority: "P1",
      startDate: "2026-05-01",
      endDate: "2026-05-01",
      description: "desc",
      notes: "notes",
      evidence: "",
      relatedItems: "",
      assignee: "Rina",
    });

    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "Task"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "Task" && params?.[3] === "Task 1" && params?.[4] === "Updated")).toBe(true);
  });

  it("updates bugs and assignees and sprints", async () => {
    await updateModuleRecord("bugs", 8, {
      project: "QA Hub",
      module: "Login",
      bugType: "UI",
      title: "Button shift",
      preconditions: "Open page",
      stepsToReproduce: "1. Open page",
      expectedResult: "Aligned",
      actualResult: "Shifted",
      severity: "low",
      priority: "P2",
      status: "open",
      evidence: "",
      relatedItems: "",
    });
    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "Bug"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "Bug" && params?.[3] === "Button shift" && params?.[4] === "Updated")).toBe(true);

    vi.clearAllMocks();
    mocks.db.run.mockResolvedValueOnce({ changes: 1 });
    await updateModuleRecord("assignees", 3, {
      name: "Rina",
      role: "QA Engineer",
      email: "rina@example.com",
      skills: "Automation",
      status: "active",
    });
    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "Assignee"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "Assignee" && params?.[3] === "Rina" && params?.[4] === "Updated")).toBe(true);

    vi.clearAllMocks();
    mocks.db.run.mockResolvedValueOnce({ changes: 1 });
    await updateModuleRecord("sprints", 12, {
      name: "Sprint 1",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      status: "active",
      goal: "Goal",
    });
    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "Sprint"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "Sprint" && params?.[3] === "Sprint 1" && params?.[4] === "Updated")).toBe(true);
  });

  it("updates users with and without passwords", async () => {
    await updateModuleRecord("users", 2, {
      name: "Rina",
      email: "rina@example.com",
      role: "pm",
      password: "secret",
    });

    expect(mocks.hashPassword).toHaveBeenCalledWith("secret");
    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "User"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "User" && params?.[3] === "rina@example.com" && params?.[4] === "Updated")).toBe(true);

    vi.clearAllMocks();
    mocks.db.run.mockResolvedValueOnce({ changes: 1 });
    await updateModuleRecord("users", 2, {
      name: "Rina",
      email: "rina@example.com",
      role: "fullstack",
    });

    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "User"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "User" && params?.[3] === "rina@example.com" && params?.[4] === "Updated")).toBe(true);
  });

  it("soft deletes archived tables", async () => {
    await deleteModuleRecord("test-plans", 11);

    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "TestPlan" SET "deletedAt" = CURRENT_TIMESTAMP');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "TestPlan" && params?.[3] === "11" && params?.[4] === "Deleted")).toBe(true);
  });

  it("hard deletes non-archived tables and soft deletes notes/suites/cases", async () => {
    await deleteModuleRecord("users", 7);
    expect(mocks.db.run.mock.calls[0][0]).toBe('UPDATE "Assignee" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = ?');
    expect(mocks.db.run.mock.calls[1][0]).toContain('UPDATE "User" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = CAST(? AS INTEGER)');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "User" && params?.[3] === "7" && params?.[4] === "Deleted")).toBe(true);

    vi.clearAllMocks();
    mocks.db.run.mockResolvedValueOnce({ changes: 1 });
    await deleteModuleRecord("test-cases", 8);
    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "TestCase" SET "deletedAt" = CURRENT_TIMESTAMP');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "TestCase" && params?.[3] === "8" && params?.[4] === "Deleted")).toBe(true);
  });

  it("creates test plans and syncs sprint rows", async () => {
    mocks.db.get.mockResolvedValueOnce({ id: 5 });

    await createModuleRecord("test-plans", {
      title: "Plan A",
      project: "QA Hub",
      sprint: "Sprint 1",
      scope: "Regression",
      status: "active",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      notes: "notes",
      assignee: "Rina",
      publicToken: "plan-token",
    });

    expect(mocks.db.run.mock.calls[0][0]).toContain('INSERT INTO "TestPlan"');
    expect(mocks.db.run.mock.calls[0][1][0]).toBe("acme");
    expect(mocks.db.run.mock.calls[0][1][1]).toBeNull();
    expect(mocks.db.run.mock.calls[0][1][2]).toBe("plan-token");
    expect(mocks.db.run.mock.calls.some(([sql]) => sql.includes('UPDATE "Sprint" SET'))).toBe(true);
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "TestPlan" && params?.[3] === "Plan A" && params?.[4] === "Created")).toBe(true);
  });

  it("creates test cases with default priority and logging", async () => {
    await createModuleRecord("test-cases", {
      testSuiteId: "s1",
      tcId: "TC-1",
      typeCase: "Positive",
      preCondition: "Ready",
      caseName: "Login works",
      testStep: "Open login",
      expectedResult: "Login success",
      actualResult: "",
      status: "Pending",
      evidence: "",
      priority: undefined,
    });

    expect(mocks.db.run.mock.calls[0][0]).toContain('INSERT INTO "TestCase"');
    expect(mocks.db.run.mock.calls[0][1][0]).toBe("acme");
    expect(mocks.db.run.mock.calls[0][1][14]).toBe("Medium");
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "TestCase" && params?.[3] === "TC-1" && params?.[4] === "Created")).toBe(true);
  });

  it("updates test plans and syncs sprint rows", async () => {
    mocks.db.run.mockResolvedValueOnce({ changes: 1 });
    mocks.db.get.mockResolvedValueOnce({ id: 5 });

    await updateModuleRecord("test-plans", 11, {
      title: "Plan A v2",
      project: "QA Hub",
      sprint: "Sprint 1",
      scope: "Regression",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      status: "active",
      notes: "updated",
      assignee: "Budi",
    });

    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "TestPlan"');
    expect(mocks.db.run.mock.calls[0][1]).toEqual([
      "Plan A v2",
      "QA Hub",
      "Sprint 1",
      "Regression",
      "2026-04-01",
      "2026-04-30",
      "active",
      "updated",
      "Budi",
      11,
      "acme",
    ]);
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "TestPlan" && params?.[3] === "Plan A v2" && params?.[4] === "Updated")).toBe(true);
  });

  it("updates test cases and hard deletes non-soft-delete tables", async () => {
    await updateModuleRecord("test-cases", 7, {
      testSuiteId: "s1",
      tcId: "TC-1",
      typeCase: "Positive",
      preCondition: "Ready",
      caseName: "Login works",
      testStep: "Open login",
      expectedResult: "Login success",
      actualResult: "Success",
      status: "Passed",
      evidence: "ok",
      priority: "High",
    });

    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "TestCase"');
    expect(mocks.db.run.mock.calls.some(([, params]) => params?.[2] === "TestCase" && params?.[3] === "Login works" && params?.[4] === "Updated")).toBe(true);

    vi.clearAllMocks();
    mocks.db.run.mockResolvedValueOnce({ changes: 1 });

    await deleteModuleRecord("users", 9);

    expect(mocks.db.run.mock.calls[0][0]).toBe('UPDATE "Assignee" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = ?');
    expect(mocks.db.run.mock.calls[1][0]).toContain('UPDATE "User" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = CAST(? AS INTEGER)');
    expect(mocks.db.run.mock.calls[1][1]).toEqual([9, "acme"]);
  });

  it("creates assignee records with company scoping and activity log", async () => {
    await createModuleRecord("assignees", {
      name: "Rina",
      role: "QA Engineer",
      email: "rina@example.com",
      skills: "Automation",
      status: "active",
    });

    expect(mocks.db.run).toHaveBeenCalledTimes(2);
    expect(mocks.db.run.mock.calls[0][0]).toContain('INSERT INTO "Assignee"');
    expect(mocks.db.run.mock.calls[0][1]).toEqual([
      "acme",
      null,
      "Rina",
      "QA Engineer",
      "rina@example.com",
      "Automation",
      "active",
    ]);
    expect(mocks.db.run.mock.calls[1][0]).toContain('INSERT INTO "ActivityLog"');
    expect(mocks.db.run.mock.calls[1][1]).toEqual([
      "acme",
      null,
      "Assignee",
      "Rina",
      "Added",
      "New team member: Rina",
      "",
      "",
    ]);
  });

  it("uses the provided company and hashes user passwords", async () => {
    await createModuleRecord("users", {
      company: "beta",
      name: "Budi",
      email: "budi@example.com",
      password: "secret",
      role: "fullstack",
    });

    expect(mocks.hashPassword).toHaveBeenCalledWith("secret");
    expect(mocks.db.run).toHaveBeenCalledTimes(2);
    expect(mocks.db.run.mock.calls[0][0]).toContain('INSERT INTO "User"');
    expect(mocks.db.run.mock.calls[0][1]).toEqual([
      "beta",
      null,
      "Budi",
      "budi@example.com",
      "hashed:secret",
      "fullstack",
    ]);
  });

  it("applies company filters when updating status", async () => {
    await updateModuleStatus("bugs", 7, "closed");

    expect(mocks.db.run).toHaveBeenCalledTimes(2);
    expect(mocks.db.run.mock.calls[0][0]).toContain('UPDATE "Bug"');
    expect(mocks.db.run.mock.calls[0][0]).toContain('AND "company" = ?');
    expect(mocks.db.run.mock.calls[0][1]).toEqual(["closed", 7, "acme"]);
    expect(mocks.db.run.mock.calls[1][1]).toEqual([
      "acme",
      null,
      "Bug",
      "7",
      "Status Update",
      "Bug status updated to closed",
      "",
      "",
    ]);
  });

  it("clears records only for the current company", async () => {
    await clearModuleRecords("tasks");

    const deleteCall = mocks.db.run.mock.calls.find(([sql]) => sql === 'DELETE FROM "Task" WHERE "company" = ?');
    expect(deleteCall).toBeDefined();
    expect(deleteCall?.[1]).toEqual(["acme"]);
  });

  it("falls back to suggested developer from the latest bug", async () => {
    mocks.db.get.mockResolvedValueOnce({ suggestedDev: "Tomo" });

    await createModuleRecord("bugs", {
      project: "QA Hub",
      module: "Login",
      bugType: "UI",
      title: "Button misaligned",
      preconditions: "Open login page",
      stepsToReproduce: "1. Open page",
      expectedResult: "Button aligned",
      actualResult: "Shifted",
      severity: "low",
      priority: "P2",
      status: "open",
      evidence: "",
      relatedItems: "",
    });

    expect(mocks.db.get).toHaveBeenCalledWith(
      'SELECT "suggestedDev" FROM "Bug" WHERE "module" = ? AND "company" = ? ORDER BY "id" DESC LIMIT 1',
      ["Login", "acme"],
    );
    expect(mocks.db.run.mock.calls[0][0]).toContain('INSERT INTO "Bug"');
    // suggestedDev is the last insert param (index 16: company, workspaceId, publicToken,...relatedItems,suggestedDev)
    expect(mocks.db.run.mock.calls[0][1][16]).toBe("Tomo");
  });
});

describe("module row queries", () => {
  it("loads resource details for a team member", async () => {
    mocks.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "Task" WHERE assignee = ?')) return [{ id: 1, title: "Task 1", status: "todo", priority: "P1" }];
      if (sql.includes('FROM "Bug" WHERE suggestedDev = ?')) return [{ id: 2, title: "Bug 1", status: "open", priority: "high" }];
      if (sql.includes('FROM "TestSuite" WHERE assignee = ?')) return [{ id: 3, title: "Suite 1", status: "active", priority: "N/A" }];
      return [];
    });

    const data = await getResourceDetails("Rina");

    expect(data).toEqual({
      tasks: [{ id: 1, title: "Task 1", status: "todo", priority: "P1", type: "Task" }],
      bugs: [],
      suites: [{ id: 3, title: "Suite 1", status: "active", priority: "N/A", type: "Suite" }],
    });
  });

  it("loads executive dashboard metrics", async () => {
    mocks.db.get.mockImplementation(async (sql: string) => {
      if (sql.includes('IN (\'critical\', \'high\', \'P0\', \'P1\')')) return { count: 2 };
      if (sql.includes('SELECT COUNT(*) as total FROM "Bug"')) return { total: 10 };
      if (sql.includes('SELECT COUNT(*) as count FROM "Task" WHERE "status" != \'done\'')) return { count: 6 };
      if (sql.includes('SELECT COUNT(*) as count FROM "TestCase" WHERE "status" IN (\'Passed\', \'Success\')')) return { count: 8 };
      if (sql.includes('SELECT COUNT(*) as total FROM "TestCase"')) return { total: 10 };
      if (sql.includes('SELECT COUNT(*) as count FROM "Bug" WHERE "status" IN (\'fixed\', \'closed\')')) return { count: 3 };
      if (sql.includes('SELECT COUNT(*) as count FROM "Task" WHERE "status" = \'completed\'')) return { count: 4 };
      if (sql.includes('SELECT project as name FROM "TestPlan" GROUP BY project ORDER BY COUNT(*) DESC LIMIT 1')) return { name: "QA Hub" };
      if (sql.includes('SELECT "title" FROM "TestPlan" WHERE "deletedAt" IS NULL')) return { title: "Plan A" };
      if (sql.includes('SELECT "project" FROM "TestPlan" WHERE "deletedAt" IS NULL')) return { project: "QA Hub" };
      if (sql.includes('WHERE "sprintId" = ?')) return { total: 5 };
      return { count: 0, total: 0 };
    });
    mocks.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "Bug" WHERE "createdAt" BETWEEN ? AND ?')) return [{ label: "Week -3", bugs: 1, fixed: 0 }];
      if (sql.includes('FROM "Bug" WHERE "status" = \'fixed\' AND "updatedAt" BETWEEN ? AND ?')) return [{ label: "Week -3", bugs: 1, fixed: 1 }];
      return [];
    });

    const data = await getExecutiveData();

    expect(data.metrics).toHaveLength(4);
    expect(data.personalSuccessRate).toBe(70);
    expect(data.summary).toMatchObject({
      health: "Needs Attention",
      planName: "Plan A",
      projectName: "QA Hub",
    });
  });

  it("loads reports and release trend data", async () => {
    mocks.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT "severity" as name, COUNT(*) as value FROM "Bug"')) return [{ name: "high", value: 2 }];
      if (sql.includes('SELECT "status" as name, COUNT(*) as value FROM "Bug"') && sql.includes('GROUP BY "status"')) return [{ name: "open", value: 3 }];
      if (sql.includes('SELECT "status" as name, COUNT(*) as value FROM "TestCase"')) return [{ name: "Passed", value: 4 }];
      if (sql.includes('SELECT date("createdAt") as date, COUNT(*) as count FROM "Bug"') && sql.includes('GROUP BY date("createdAt")')) return [{ date: "2026-04-30", count: 5 }];
      if (sql.includes('SELECT id, title, severity, status, "updatedAt" FROM "Bug" WHERE "status" IN (\'fixed\', \'closed\')')) return [{ id: 1, title: "Bug 1", severity: "high" }];
      if (sql.includes('SELECT id, title FROM "Task" WHERE "status" = \'completed\'')) return [{ id: 2, title: "Task 1" }];
      return [];
    });
    mocks.db.get.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT COUNT(*) as count FROM "Bug" WHERE "createdAt" BETWEEN ? AND ?')) return { count: 1 };
      if (sql.includes('SELECT COUNT(*) as count FROM "Bug" WHERE "status" = \'fixed\' AND "updatedAt" BETWEEN ? AND ?')) return { count: 2 };
      return { count: 0 };
    });

    const reports = await getReportsData();
    expect(reports).toEqual({
      bugSeverityData: [{ name: "high", value: 2 }],
      bugStatusData: [{ name: "open", value: 3 }],
      testCaseStatusData: [{ name: "Passed", value: 4 }],
      bugTrendData: [{ date: "2026-04-30", count: 5 }],
    });

    const releaseNotes = await getReleaseNotes();
    expect(releaseNotes).toEqual({
      fixedBugs: [{ code: "BUG-001", title: "Bug 1", severity: "high" }],
      completedTasks: [{ code: "TASK-002", title: "Task 1" }],
    });

    const trend = await getQualityTrend();
    expect(trend).toHaveLength(4);
    expect(trend[0]).toMatchObject({ label: "Week -3", bugs: 1, fixed: 2 });
  });

  it("loads dashboard data with shaped metrics and summary", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ role: "pm", company: "acme" });
    mocks.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT "id", "title", "priority", "status" FROM "Task"') && sql.includes('LIMIT 5')) return [{ id: 1, title: "Task 1", priority: "P1", status: "todo" }];
      if (sql.includes('SELECT "id", "title", "severity", "priority", "status" FROM "Bug"') && sql.includes('LIMIT 5')) return [{ id: 2, title: "Bug 1", severity: "high", priority: "P1", status: "open" }];
      if (sql.includes('SELECT "id", "caseName", "priority", "status" FROM "TestCase"') && sql.includes('LIMIT 5')) return [{ id: 3, caseName: "Case 1", priority: "High", status: "Passed" }];
      if (sql.includes('SELECT id, title, severity, status, "updatedAt" FROM "Bug" WHERE "status" IN (\'fixed\', \'closed\')')) return [{ id: 2, title: "Bug 1", severity: "high" }];
      if (sql.includes('SELECT id, title FROM "Task" WHERE "status" = \'completed\'')) return [{ id: 1, title: "Task 1" }];
      if (sql.includes('GROUP BY status') && sql.includes('"Task"')) return [{ status: "todo", count: 2 }];
      if (sql.includes('GROUP BY severity') && sql.includes('"Bug"')) return [{ severity: "high", count: 1 }];
      if (sql.includes('DATE("createdAt") as date') && sql.includes('"Bug"')) return [{ date: "2026-04-30", count: 1 }];
      if (sql.includes('ORDER BY "startDate" DESC LIMIT 20')) return [{ id: 1, name: "Sprint 1", startDate: "2026-04-01", endDate: "2026-04-30", status: "active" }];
      if (sql.includes('FROM "ActivityLog"')) return [{ id: 9, entityType: "Task", entityId: "1", action: "Created", summary: "Task 1", createdAt: "2026-04-30" }];
      if (sql.includes('GROUP BY module LIMIT 10')) return [{ module: "Login", count: 1 }];
      if (sql.includes('date("updatedAt") = CURRENT_DATE') && sql.includes('"Task"')) return [{ type: "Task", label: "Task 1", status: "todo" }];
      if (sql.includes('date("updatedAt") = CURRENT_DATE') && sql.includes('"Bug"')) return [{ type: "Bug", label: "Bug 1", status: "open" }];
      if (sql.includes('date("createdAt") = CURRENT_DATE') && sql.includes('"TestSession"')) return [{ type: "Session", label: "Smoke", status: "passed" }];
      if (sql.includes('severity" IN (\'critical\'') && sql.includes('LIMIT 5')) return [{ id: 2, title: "Bug 1", severity: "critical" }];
      if (sql.includes('priority" IN (\'high\'') && sql.includes('LIMIT 5')) return [{ id: 1, title: "Task 1", priority: "high" }];
      if (sql.includes('FROM "TestSession"') && sql.includes('LIMIT 10') && sql.includes('ORDER BY "createdAt" DESC')) return [{ id: 4, date: "2026-04-30", tester: "Rina", scope: "Smoke", totalCases: 2, passed: 2, failed: 0, blocked: 0, result: "passed" }];
      if (sql.includes('SELECT module, COUNT(*) as count FROM "Bug"') && sql.includes('GROUP BY module')) return [{ module: "Login", count: 1 }];
      if (sql.includes('SELECT COUNT(*) as total FROM "Task"')) return { total: 3 };
      if (sql.includes('SELECT COUNT(*) as total FROM "Bug"')) return { total: 2 };
      if (sql.includes('SELECT COUNT(*) as total FROM "TestCase"')) return { total: 4 };
      if (sql.includes("SELECT COUNT(*) as count FROM \"Bug\" WHERE status IN ('fixed', 'closed')")) return { count: 1 };
      if (sql.includes("SELECT COUNT(*) as count FROM \"Task\" WHERE status = 'completed'")) return { count: 2 };
      if (sql.includes('SELECT project as name FROM "TestPlan" GROUP BY project ORDER BY COUNT(*) DESC LIMIT 1')) return { name: "QA Hub" };
      if (sql.includes('SELECT "title" FROM "TestPlan" WHERE "deletedAt" IS NULL')) return { title: "Plan A" };
      if (sql.includes('SELECT "project" FROM "TestPlan" WHERE "deletedAt" IS NULL')) return { project: "QA Hub" };
      return [];
    });
    mocks.db.get.mockImplementation(async (sql: string) => {
      if (sql.includes('BETWEEN ? AND ?')) return { count: 1 };
      if (sql.includes('SELECT * FROM "Sprint" WHERE status = \'active\'')) return null;
      if (sql.includes("SELECT COUNT(*) as count FROM \"Bug\" WHERE status IN ('fixed', 'closed')")) return { count: 1 };
      if (sql.includes("SELECT COUNT(*) as count FROM \"Task\" WHERE status = 'completed'")) return { count: 2 };
      if (sql.includes('SELECT project as name FROM "TestPlan"') && sql.includes('GROUP BY project')) return { name: "QA Hub" };
      if (sql.includes('SELECT "title" FROM "TestPlan" WHERE "deletedAt" IS NULL')) return { title: "Plan A" };
      if (sql.includes('SELECT "project" FROM "TestPlan" WHERE "deletedAt" IS NULL')) return { project: "QA Hub" };
      if (sql.includes('SELECT COUNT(*) as total FROM "Task"')) return { total: 3 };
      if (sql.includes('SELECT COUNT(*) as total FROM "Bug"')) return { total: 2 };
      if (sql.includes('SELECT COUNT(*) as total FROM "TestCase"')) return { total: 4 };
      return null;
    });

    const dashboard = await getDashboardData();

    expect(dashboard.rolePersona).toBe("pm");
    expect(dashboard.metrics[0]).toMatchObject({ label: "Open Tasks", value: 3 });
    expect(dashboard.recent.tasks[0]).toMatchObject({ id: 1, code: "TASK-001" });
    expect(dashboard.distribution.tasks).toEqual([{ name: "todo", value: 2 }]);
    expect(dashboard.todayActivity).toEqual([
      { type: "Task", label: "Task 1", status: "todo" },
      { type: "Bug", label: "Bug 1", status: "open" },
      { type: "Session", label: "Smoke", status: "passed" },
    ]);
    expect(dashboard.personalSuccessRate).toBe(60);
    expect(dashboard.spotlight).toMatchObject({
      projectName: "QA Hub",
      totalScenarios: 4,
      totalBugs: 2,
    });
    expect(dashboard.rolePersona).toBe("pm");
  });

  it("keeps project filters off company-only dashboard tables", async () => {
    mocks.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "ActivityLog"')) return [];
      if (sql.includes('FROM "Sprint"')) return [];
      if (sql.includes('FROM "Assignee"')) return [];
      if (sql.includes('FROM "Task"')) return [];
      if (sql.includes('FROM "Bug"')) return [];
      if (sql.includes('FROM "TestCase"')) return [];
      if (sql.includes('FROM "TestSession"')) return [];
      if (sql.includes('SELECT project as name FROM "TestPlan" GROUP BY project ORDER BY COUNT(*) DESC LIMIT 1')) return [{ name: "EcoShop Web" }];
      return [];
    });
    mocks.db.get.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*) as total FROM')) return { total: 0 };
      if (sql.includes('SELECT * FROM "Sprint" WHERE status = \'active\'')) return null;
      if (sql.includes('COUNT(*) as count FROM "Bug" WHERE status IN')) return { count: 0 };
      if (sql.includes('COUNT(*) as count FROM "Task" WHERE status = \'completed\'')) return { count: 0 };
      if (sql.includes('SELECT "title" FROM "TestPlan"')) return null;
      if (sql.includes('SELECT "project" FROM "TestPlan"')) return null;
      return null;
    });

    await getDashboardData("EcoShop Web");

    const sqlCalls = mocks.db.query.mock.calls.map(([sql]) => String(sql));
    expect(sqlCalls.some((sql) => sql.includes('FROM "ActivityLog"') && sql.includes('WHERE "company" = ?') && !sql.includes('"project" = ?'))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes('FROM "Sprint"') && sql.includes('WHERE "company" = ?') && !sql.includes('"project" = ?'))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes('FROM "ActivityLog"') && sql.includes('"project" = ?'))).toBe(false);
  });

  it("loads project data with stats and nested relations", async () => {
    mocks.db.query
      .mockResolvedValueOnce([{ id: 1, title: "Plan A", project: "QA Hub", sprint: "Sprint 1", assignee: "Rina", status: "active", startDate: "2026-04-01", endDate: "2026-04-30", notes: "", scope: "Regression", publicToken: "plan-1" }])
      .mockResolvedValueOnce([{ id: 2, project: "QA Hub", module: "Login", bugType: "UI", title: "Button shift", preconditions: "", stepsToReproduce: "", expectedResult: "", actualResult: "", severity: "low", priority: "P2", status: "open", evidence: "", relatedItems: "" }])
      .mockResolvedValueOnce([{ id: 3, title: "Task 1", project: "QA Hub", relatedFeature: "Login", category: "Testing", status: "todo", priority: "P1", startDate: "2026-05-01", endDate: "2026-05-01", description: "desc", notes: "", evidence: "", relatedItems: "", assignee: "Rina" }])
      .mockResolvedValueOnce([{ id: 4, date: "2026-04-30", project: "QA Hub", sprint: "Sprint 1", tester: "Rina", scope: "Smoke", totalCases: 2, passed: 1, failed: 1, blocked: 0, result: "failed", notes: "" }])
      .mockResolvedValueOnce([{ id: 5, date: "2026-04-30", project: "QA Hub", title: "Daily", attendees: "", content: "", actionItems: "" }])
      .mockResolvedValueOnce([{ id: 6, testPlanId: 1, title: "Suite A", assignee: "Rina", status: "active", notes: "", publicToken: "suite-1" }])
      .mockResolvedValueOnce([{ id: 7, testSuiteId: 6, tcId: "TC-7", caseName: "Case 7", typeCase: "Positive", status: "Passed", priority: "High", actualResult: "", preCondition: "", testStep: "", expectedResult: "", evidence: "", deletedAt: null }]);

    const project = await getProjectData("QA Hub");

    expect(project.projectName).toBe("QA Hub");
    expect(project.stats).toEqual({
      totalPlans: 1,
      totalBugs: 1,
      totalTasks: 1,
      openBugs: 1,
      openTasks: 0,
      totalCases: 1,
      passed: 1,
      failed: 0,
      blocked: 0,
      pending: 0,
      successRate: 100,
    });
    expect(project.plans[0]).toMatchObject({ id: "1", code: "", title: "Plan A" });
    expect(project.bugs[0]).toMatchObject({ id: 2, code: "BUG-002", title: "Button shift" });
    expect(project.tasks[0]).toMatchObject({ id: 3, code: "TASK-003", title: "Task 1" });
    expect(project.sessions[0]).toMatchObject({ id: 4, code: "SES-004", tester: "Rina" });
    expect(project.meetings[0]).toMatchObject({ id: 5, code: "MEET-005", title: "Daily" });
    expect(project.suites[0]).toMatchObject({ id: "6", title: "Suite A", total: 1, passed: 1 });
  });

  it("loads test cases with suite and plan context", async () => {
    mocks.db.query.mockResolvedValueOnce([
      { id: 1, tcId: "TC-1", caseName: "Case 1", testSuiteId: "S1", status: "Passed", priority: "High", evidence: "", preCondition: "", testStep: "", expectedResult: "", actualResult: "", suiteTitle: "Suite A", suiteToken: "suite-token", suiteStatus: "active", suiteAssignee: "Magnus QA", planTitle: "Plan A", planProject: "QA Hub" },
    ]);

    const rows = await getAllTestCasesWithSuite();

    expect(mocks.db.query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN "TestSuite" ts ON ts.id = CAST(tc."testSuiteId" AS INTEGER)'),
      ["acme"],
    );
    expect(rows[0]).toMatchObject({
      id: 1,
      tcId: "TC-1",
      suiteTitle: "Suite A",
      suiteAssignee: "Magnus QA",
      planTitle: "Plan A",
      planProject: "QA Hub",
    });
  });

  it("loads user rows with company scope", async () => {
    mocks.db.query.mockResolvedValueOnce([
      { id: 1, name: "Rina", email: "rina@example.com", role: "pm", company: "acme", createdAt: "2026-04-30" },
    ]);

    const rows = await getModuleRows("users");

    expect(mocks.db.query).toHaveBeenCalledWith(
      'SELECT id, name, email, role, company, "createdAt" FROM "User"  WHERE "company" = ? ORDER BY "createdAt" DESC',
      ["acme"],
    );
    expect(rows).toEqual([
      { id: 1, name: "Rina", email: "rina@example.com", role: "pm", company: "acme", createdAt: "2026-04-30" },
    ]);
  });

  it("hydrates deployment notes from changelog when notes are empty", async () => {
    mocks.db.query.mockResolvedValueOnce([
      {
        id: 1,
        date: "2026-05-06",
        version: "v1.0.4",
        project: "VanApp",
        environment: "Development",
        developer: "Developer A",
        changelog: "1. Perbaikan spasi (slide 4) -> Sudah diperbaiki ; belum di test",
        status: "success",
        notes: "",
        company: "acme",
      },
    ]);

    const rows = await getModuleRows("deployments");

    expect(rows[0]).toMatchObject({
      notes: "1. Visual & UI Improvements: Perbaikan spasi to keep the layout balanced.",
    });
  });

  it("reads assignees from User table and filters admins", async () => {
    mocks.db.query
      .mockResolvedValueOnce([
        { id: 1, name: "Admin User", role: "admin", email: "admin@example.com", skills: "", status: "active" },
        { id: 2, name: "Rina", role: "qa", email: "rina@example.com", skills: "", status: "active" },
      ])
      .mockResolvedValueOnce([{ id: 2, project: "QA Hub", title: "Daily", date: "2026-04-30" }]);

    const assignees = await getModuleRows("assignees");
    await getModuleRows("meeting-notes");

    expect(mocks.db.query.mock.calls.some(([sql]) => String(sql).includes('FROM "User"'))).toBe(true);
    expect(mocks.db.query.mock.calls.some(([sql]) => String(sql).includes('FROM "MeetingNote"'))).toBe(true);
    expect(assignees).toEqual([
      { id: "2", name: "Rina", role: "qa", email: "rina@example.com", skills: "", status: "active" },
    ]);
  });

  it("adds suite statistics and company scoping", async () => {
    mocks.db.query.mockResolvedValueOnce([
      { id: 1, testPlanId: 11, title: "Suite A", status: "active", assignee: "Rina", notes: "", publicToken: "suite-1", company: "acme", updatedAt: "2026-04-30", passed: 3, failed: 1, blocked: 0 },
    ]);

    const rows = await getModuleRows("test-suites");

    expect(mocks.db.query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN case_stats cs ON CAST(cs.suiteId AS INTEGER) = ts.id'),
      ["acme", "acme"],
    );
    expect(rows[0]).toMatchObject({
      id: "1",
      title: "Suite A",
      code: "SUITE-001",
      passed: 3,
      failed: 1,
      blocked: 0,
    });
  });

  it("loads sprint rows with derived plan data", async () => {
    mocks.db.query.mockResolvedValueOnce([
      { id: 1, name: "Sprint 1", startDate: "2026-04-01", endDate: "2026-04-30", status: "active", _planInfo: null },
    ]);

    const rows = await getModuleRows("sprints");

    expect(mocks.db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM "Sprint" s'),
      ["acme", "acme"],
    );
    expect(rows).toEqual([
      { id: 1, name: "Sprint 1", startDate: "2026-04-01", endDate: "2026-04-30", status: "active", testPlanTitle: null, project: null },
    ]);
  });
});
