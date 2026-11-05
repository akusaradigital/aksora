import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listProjectMembers: vi.fn(),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
  updateProjectMemberRole: vi.fn(),
  getProjectMemberRole: vi.fn(),
  createInvite: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbQuery: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    run: mocks.dbRun,
    query: mocks.dbQuery,
  },
}));

vi.mock("@/lib/project-members", () => ({
  listProjectMembers: mocks.listProjectMembers,
  addProjectMember: mocks.addProjectMember,
  removeProjectMember: mocks.removeProjectMember,
  updateProjectMemberRole: mocks.updateProjectMemberRole,
  getProjectMemberRole: mocks.getProjectMemberRole,
}));

vi.mock("@/lib/invites", () => ({
  createInvite: mocks.createInvite,
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/projects/[id]/members/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({
    id: 1,
    role: "admin",
    company: "Acme",
    activeWorkspaceId: 10,
  });
  mocks.dbGet.mockResolvedValue({ id: 5, name: "Web App", company: "Acme", workspaceId: 10 });
  mocks.dbQuery.mockResolvedValue([]);
  mocks.listProjectMembers.mockResolvedValue([]);
  mocks.getProjectMemberRole.mockResolvedValue("admin");
});

describe("project members route", () => {
  it("GET: returns members and pending invites for project", async () => {
    mocks.listProjectMembers.mockResolvedValueOnce([
      { id: 1, uuid: "u1", projectId: 5, userId: 2, role: "qa", name: "Bob", email: "bob@acme.com" },
    ]);

    const req = new NextRequest("http://localhost/api/projects/5/members");
    const res = await GET(req, { params: Promise.resolve({ id: "5" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.projectId).toBe(5);
    expect(body.data.members).toHaveLength(1);
    expect(body.data.members[0].name).toBe("Bob");
  });

  it("POST: adds existing workspace user to project", async () => {
    mocks.dbGet
      .mockResolvedValueOnce({ id: 5, name: "Web App", company: "Acme", workspaceId: 10 }) // verifyProjectAccess
      .mockResolvedValueOnce({ id: 3, name: "Charlie", email: "charlie@acme.com" }); // targetUser

    mocks.addProjectMember.mockResolvedValueOnce(12);

    const req = new NextRequest("http://localhost/api/projects/5/members", {
      method: "POST",
      body: JSON.stringify({ userId: 3, role: "fe" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });

    expect(res.status).toBe(200);
    expect(mocks.addProjectMember).toHaveBeenCalledWith(5, 3, "fe", 10);
  });

  it("POST: generates project-specific invite link", async () => {
    mocks.createInvite.mockResolvedValueOnce({
      token: "inv-token-99",
      company: "Acme",
      role: "qa",
      projectId: 5,
      expiresAt: "2026-05-10",
    });

    const req = new NextRequest("http://localhost/api/projects/5/members", {
      method: "POST",
      body: JSON.stringify({ role: "qa", expiresInDays: 7 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "5" }) });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.link).toContain("inviteToken=inv-token-99");
    expect(mocks.createInvite).toHaveBeenCalledWith({
      company: "Acme",
      workspaceId: 10,
      projectId: 5,
      role: "qa",
      expiresInDays: 7,
    });
  });

  it("PATCH: updates member role in project", async () => {
    const req = new NextRequest("http://localhost/api/projects/5/members", {
      method: "PATCH",
      body: JSON.stringify({ userId: 2, role: "pm" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "5" }) });

    expect(res.status).toBe(200);
    expect(mocks.updateProjectMemberRole).toHaveBeenCalledWith(5, 2, "pm");
  });

  it("DELETE: removes member from project", async () => {
    const req = new NextRequest("http://localhost/api/projects/5/members?userId=2", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "5" }) });

    expect(res.status).toBe(200);
    expect(mocks.removeProjectMember).toHaveBeenCalledWith(5, 2);
  });
});
