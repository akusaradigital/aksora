import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  logActivity: vi.fn(),
  db: {
    query: vi.fn(),
    get: vi.fn(),
  },
  invalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
  logActivity: mocks.logActivity,
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/data/data-dashboard-stats", () => ({
  invalidateDashboardCache: mocks.invalidateDashboardCache,
}));

import { GET, POST } from "@/app/api/projects/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({
    id: 1,
    name: "Wahyu",
    role: "admin",
    company: "akusara",
    email: "wahyu@akusara.com",
    workspaceId: 10,
  });
  mocks.getAccessScope.mockReturnValue({
    andWhere: ' AND "company" = ? AND "workspaceId" = ?',
    params: ["akusara", 10],
    company: "akusara",
    isAdmin: true,
    workspaceId: 10,
  });
});

describe("GET /api/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns projects list when authenticated", async () => {
    mocks.db.query.mockResolvedValueOnce([
      {
        id: 1,
        name: "Mobile App",
        key: "MOB",
        description: "Mobile client",
        status: "active",
        publicToken: "tok-1",
        planCount: 2,
        bugCount: 1,
        taskCount: 3,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Mobile App");
    expect(json.data[0].key).toBe("MOB");
  });
});

describe("POST /api/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Web App" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is empty", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 400 when duplicate project exists in workspace", async () => {
    mocks.db.get.mockResolvedValueOnce({ id: 99 }); // duplicate found
    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Existing Project" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("already exists");
  });

  it("creates project successfully with custom key", async () => {
    mocks.db.get
      .mockResolvedValueOnce(null) // no duplicate
      .mockResolvedValueOnce({
        id: 101,
        name: "Customer Portal",
        key: "CPORT",
        description: "B2B portal",
        status: "active",
        publicToken: "tok-101",
        createdAt: "2026-10-29T10:00:00Z",
      });

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "Customer Portal",
        key: "CPORT",
        description: "B2B portal",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Customer Portal");
    expect(json.data.key).toBe("CPORT");
    expect(mocks.logActivity).toHaveBeenCalled();
    expect(mocks.invalidateDashboardCache).toHaveBeenCalled();
  });
});
