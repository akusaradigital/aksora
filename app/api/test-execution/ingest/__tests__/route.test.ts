import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  authenticateApiRequest: vi.fn(),
  dbQuery: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/api-auth", () => ({
  authenticateApiRequest: mocks.authenticateApiRequest,
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

describe("POST /api/test-execution/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.authenticateApiRequest.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/test-execution/ingest", {
      method: "POST",
      body: JSON.stringify({ testSuiteId: 10, report: "<testsuites/>" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("ingests JUnit XML and records verdicts into ExecutionRun", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 1,
      name: "QA Lead",
      email: "qa@example.com",
      company: "Acme",
      workspaceId: 1,
    });

    mocks.dbGet
      .mockResolvedValueOnce({ id: 10, title: "Checkout Suite", testPlanId: "PLAN-1" }) // suite check
      .mockResolvedValueOnce({ maxNum: 2 }) // last run number
      .mockResolvedValueOnce({ id: 99 }); // newly created run

    mocks.dbQuery.mockResolvedValueOnce([
      { id: 101, tcId: "TC-001", caseName: "Add item to cart" },
      { id: 102, tcId: "TC-002", caseName: "Checkout with card" },
    ]);

    const xml = `
      <testsuites>
        <testsuite name="Cart">
          <testcase classname="Cart" name="Add item to cart" time="0.12" />
          <testcase classname="Cart" name="Checkout with card" time="0.45">
            <failure message="Payment gateway timeout">Gateway 504</failure>
          </testcase>
        </testsuite>
      </testsuites>
    `;

    const req = new NextRequest("http://localhost/api/test-execution/ingest", {
      method: "POST",
      body: JSON.stringify({
        testSuiteId: 10,
        format: "junit",
        report: xml,
        metadata: { runner: "GitHub Actions", branch: "feature/checkout" },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.data).toMatchObject({
      runId: 99,
      runNumber: 3,
      totalCases: 2,
      passed: 1,
      failed: 1,
      status: "completed",
    });

    expect(mocks.dbRun).toHaveBeenCalled();
  });
});
