import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSessions, POST as createSession } from "../route";
import { PATCH as updateSession } from "../[id]/route";
import { POST as logBugFromSession } from "../[id]/log-bug/route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbQuery: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: mocks.dbQuery,
    get: mocks.dbGet,
    run: mocks.dbRun,
  },
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: vi.fn(() => ({ company: "Acme", workspaceId: 1, andWhere: "", params: [] })),
  logActivity: mocks.logActivity,
}));

describe("Exploratory Sessions (SBTM) Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates exploratory session charter", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, name: "QA Lead", company: "Acme", workspaceId: 1 });
    mocks.dbGet.mockResolvedValueOnce({
      id: 1,
      title: "Voucher Discount Edge Cases",
      charter: "Explore checkout voucher combinations to uncover stacking discount glitches",
      targetDurationMinutes: 45,
      status: "in_progress",
    });

    const req = new NextRequest("http://localhost/api/exploratory-sessions", {
      method: "POST",
      body: JSON.stringify({
        title: "Voucher Discount Edge Cases",
        charter: "Explore checkout voucher combinations to uncover stacking discount glitches",
        targetDurationMinutes: 45,
      }),
    });

    const res = await createSession(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("Voucher Discount Edge Cases");
  });

  it("lists exploratory sessions", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, name: "QA Lead", company: "Acme", workspaceId: 1 });
    mocks.dbQuery.mockResolvedValueOnce([{ id: 1, title: "Charter 1" }]);

    const req = new NextRequest("http://localhost/api/exploratory-sessions");
    const res = await getSessions(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("updates exploratory session", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, name: "QA Lead", company: "Acme", workspaceId: 1 });
    mocks.dbGet
      .mockResolvedValueOnce({ id: 1, title: "Charter 1", status: "in_progress", startedAt: new Date().toISOString() })
      .mockResolvedValueOnce({ id: 1, title: "Charter 1", status: "completed" });

    const req = new NextRequest("http://localhost/api/exploratory-sessions/1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    const res = await updateSession(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
  });

  it("logs a bug directly from exploratory session", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, name: "QA Lead", company: "Acme", workspaceId: 1 });
    mocks.dbGet
      .mockResolvedValueOnce({ id: 10, title: "Checkout Charter", project: "E-Comm", bugsFound: 0 })
      .mockResolvedValueOnce({ id: 50 }); // created bug

    const req = new NextRequest("http://localhost/api/exploratory-sessions/10/log-bug", {
      method: "POST",
      body: JSON.stringify({
        title: "Negative discount when coupon removed",
        severity: "High",
        actualResult: "Total drops below zero",
      }),
    });

    const res = await logBugFromSession(req, { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.bugId).toBe(50);
    expect(json.data.sessionBugCount).toBe(1);
    expect(mocks.dbRun).toHaveBeenCalled();
  });
});
