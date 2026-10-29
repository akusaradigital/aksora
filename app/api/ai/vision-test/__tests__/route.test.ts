import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    run: mocks.dbRun,
  },
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: vi.fn(() => ({ company: "Acme", workspaceId: 1, andWhere: "", params: [] })),
  logActivity: mocks.logActivity,
}));

describe("POST /api/ai/vision-test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized users", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/ai/vision-test", {
      method: "POST",
      body: JSON.stringify({ testCaseId: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("verifies screenshot against test case and returns structured vision findings", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 1,
      name: "Tester",
      email: "tester@example.com",
      company: "Acme",
      workspaceId: 1,
    });

    mocks.dbGet.mockResolvedValueOnce({
      id: 5,
      tcId: "TC-005",
      caseName: "Responsive Mobile Header Navigation",
      preCondition: "Open on mobile viewport (375px)",
      testStep: "Tap hamburger menu",
      expectedResult: "Navigation drawer opens without horizontal overflow",
      typeCase: "Visual",
      priority: "High",
    });

    const req = new NextRequest("http://localhost/api/ai/vision-test", {
      method: "POST",
      body: JSON.stringify({
        testCaseId: 5,
        imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        viewport: "mobile",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.data).toBeDefined();
    expect(json.data.verdict).toBe("Passed");
    expect(json.data.confidence).toBeGreaterThan(0);
    expect(json.data.visualAssertions.length).toBeGreaterThan(0);
    expect(json.viewport).toBe("mobile");
  });
});
