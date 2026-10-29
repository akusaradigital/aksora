import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  logActivity: vi.fn(),
  db: {
    query: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
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

import { GET, PATCH, DELETE } from "@/app/api/projects/[id]/route";
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

describe("GET /api/projects/[id]", () => {
  it("returns 401 when unauthorized", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/projects/1");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when project not found", async () => {
    mocks.db.get.mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost:3000/api/projects/999");
    const res = await GET(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns project details when found", async () => {
    mocks.db.get.mockResolvedValueOnce({
      id: 1,
      name: "Mobile App",
      key: "MOB",
      description: "Mobile app project",
      status: "active",
      planCount: 2,
      bugCount: 3,
      taskCount: 5,
    });
    const req = new NextRequest("http://localhost:3000/api/projects/1");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("Mobile App");
    expect(json.data.planCount).toBe(2);
  });
});

describe("PATCH /api/projects/[id]", () => {
  it("archives project successfully", async () => {
    mocks.db.get.mockResolvedValueOnce({
      id: 1,
      name: "Mobile App",
      key: "MOB",
      description: "Desc",
      status: "active",
      publicToken: "tok-1",
    });

    const req = new NextRequest("http://localhost:3000/api/projects/1", {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("archived");
    expect(mocks.logActivity).toHaveBeenCalledWith(
      "akusara",
      "Project",
      "Mobile App",
      "Archived",
      expect.any(String),
      "Wahyu",
      "tok-1",
      10,
    );
  });

  it("renames project and updates children", async () => {
    mocks.db.get
      .mockResolvedValueOnce({
        id: 1,
        name: "Old Name",
        key: "OLD",
        description: "Desc",
        status: "active",
        publicToken: "tok-1",
      })
      .mockResolvedValueOnce(null); // No duplicate name

    const req = new NextRequest("http://localhost:3000/api/projects/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("New Name");
    expect(mocks.db.run).toHaveBeenCalled();
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("prevents deletion if project has active items and cascade is not set", async () => {
    mocks.db.get
      .mockResolvedValueOnce({ id: 1, name: "Core", publicToken: "tok-core" })
      .mockResolvedValueOnce({ planCount: 3, bugCount: 1, taskCount: 2 }); // Active items exist

    const req = new NextRequest("http://localhost:3000/api/projects/1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409); // Conflict
    const json = await res.json();
    expect(json.error).toContain("Cannot delete project");
    expect(json.counts.planCount).toBe(3);
    expect(mocks.db.run).not.toHaveBeenCalled();
  });

  it("soft-deletes project and cascades when cascade=true is provided", async () => {
    mocks.db.get
      .mockResolvedValueOnce({ id: 1, name: "Core", publicToken: "tok-core" })
      .mockResolvedValueOnce({ planCount: 3, bugCount: 1, taskCount: 2 });

    const req = new NextRequest("http://localhost:3000/api/projects/1?cascade=true", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(mocks.db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "Project" SET "deletedAt" = CURRENT_TIMESTAMP'),
      expect.any(Array),
    );
    expect(mocks.logActivity).toHaveBeenCalled();
  });

  it("deletes empty project without requiring cascade", async () => {
    mocks.db.get
      .mockResolvedValueOnce({ id: 2, name: "Empty", publicToken: "tok-empty" })
      .mockResolvedValueOnce({ planCount: 0, bugCount: 0, taskCount: 0 });

    const req = new NextRequest("http://localhost:3000/api/projects/2", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(200);
    expect(mocks.db.run).toHaveBeenCalled();
  });
});
