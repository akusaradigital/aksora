import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCanaries, POST as createCanary } from "../route";
import { POST as pingCanary } from "../[id]/ping/route";

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

describe("Canary Health Monitor Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists canaries for authenticated user", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, company: "Acme", workspaceId: 1 });
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 1, name: "Staging API", url: "https://staging.example.com/api/ping", isHealthy: 1 },
    ]);

    const req = new NextRequest("http://localhost/api/canary");
    const res = await getCanaries(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Staging API");
  });

  it("creates a new canary endpoint", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, company: "Acme", workspaceId: 1 });
    mocks.dbGet.mockResolvedValueOnce({
      id: 2,
      name: "Auth Service",
      url: "https://auth.example.com/health",
      environment: "staging",
    });

    const req = new NextRequest("http://localhost/api/canary", {
      method: "POST",
      body: JSON.stringify({
        name: "Auth Service",
        url: "https://auth.example.com/health",
        environment: "staging",
      }),
    });

    const res = await createCanary(req);
    expect(res.status).toBe(201);
    expect(mocks.dbRun).toHaveBeenCalled();
  });

  it("pings an existing canary endpoint", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 1, company: "Acme", workspaceId: 1 });
    mocks.dbGet.mockResolvedValueOnce({
      id: 5,
      url: "https://example.com/api/health",
      method: "GET",
      expectedStatus: 200,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));

    const req = new NextRequest("http://localhost/api/canary/5/ping", { method: "POST" });
    const res = await pingCanary(req, { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isHealthy).toBe(true);
  });
});
