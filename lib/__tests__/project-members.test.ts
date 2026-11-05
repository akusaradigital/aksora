import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    get: vi.fn(),
    run: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import {
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  getProjectMemberRole,
} from "@/lib/project-members";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.get.mockResolvedValue(undefined);
  mocks.db.run.mockResolvedValue(undefined);
  mocks.db.query.mockResolvedValue([]);
});

describe("project-members", () => {
  it("lists project members joining User details", async () => {
    mocks.db.query.mockResolvedValueOnce([
      {
        id: 1,
        uuid: "pm-uuid-1",
        projectId: 10,
        userId: 2,
        workspaceId: 1,
        role: "qa",
        name: "Alice",
        email: "alice@example.com",
        avatar: "",
        createdAt: "2026-04-30",
        updatedAt: "2026-04-30",
      },
    ]);

    const members = await listProjectMembers(10);

    expect(members).toHaveLength(1);
    expect(members[0].name).toBe("Alice");
    expect(members[0].role).toBe("qa");
    expect(mocks.db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM "ProjectMember" pm'),
      [10],
    );
  });

  it("adds a new project member with uuid and role", async () => {
    mocks.db.get
      .mockResolvedValueOnce(undefined) // existing check
      .mockResolvedValueOnce({ id: 5 }); // created check

    const id = await addProjectMember(10, 3, "fe", 1);

    expect(id).toBe(5);
    expect(mocks.db.run).toHaveBeenCalledWith(
      'INSERT INTO "ProjectMember" ("uuid", "projectId", "userId", "workspaceId", "role") VALUES (?, CAST(? AS INTEGER), CAST(? AS INTEGER), CAST(? AS INTEGER), ?)',
      [expect.any(String), 10, 3, 1, "fe"],
    );
  });

  it("updates existing member role if already assigned to project", async () => {
    mocks.db.get.mockResolvedValueOnce({ id: 8 }); // existing member

    const id = await addProjectMember(10, 3, "pm", 1);

    expect(id).toBe(8);
    expect(mocks.db.run).toHaveBeenCalledWith(
      'UPDATE "ProjectMember" SET "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      ["pm", 8],
    );
  });

  it("removes a member from a project", async () => {
    const success = await removeProjectMember(10, 3);

    expect(success).toBe(true);
    expect(mocks.db.run).toHaveBeenCalledWith(
      'DELETE FROM "ProjectMember" WHERE "projectId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
      [10, 3],
    );
  });

  it("updates member role", async () => {
    const success = await updateProjectMemberRole(10, 3, "admin");

    expect(success).toBe(true);
    expect(mocks.db.run).toHaveBeenCalledWith(
      'UPDATE "ProjectMember" SET "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "projectId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
      ["admin", 10, 3],
    );
  });

  it("resolves project member role: admin overrides, fallback to member role", async () => {
    // Admin workspace role always has admin access to any project
    const adminRole = await getProjectMemberRole(10, 1, "admin");
    expect(adminRole).toBe("admin");

    // Regular member with assigned project role
    mocks.db.get.mockResolvedValueOnce({ role: "fe" });
    const feRole = await getProjectMemberRole(10, 2, "qa");
    expect(feRole).toBe("fe");

    // Member without specific project role falls back to workspace role
    mocks.db.get.mockResolvedValueOnce(undefined);
    const fallbackRole = await getProjectMemberRole(10, 3, "pm");
    expect(fallbackRole).toBe("pm");
  });
});
