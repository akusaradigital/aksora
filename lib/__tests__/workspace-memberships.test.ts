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
  ensureWorkspace,
  ensurePersonalWorkspaceForUser,
  getWorkspaceMembershipsForUser,
  isOwnerUser,
} from "@/lib/workspace-memberships";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.get.mockResolvedValue(undefined);
  mocks.db.run.mockResolvedValue(undefined);
  mocks.db.query.mockResolvedValue([]);
});

describe("workspace-memberships", () => {
  describe("isOwnerUser", () => {
    it("identifies Wahyu as the primary owner", () => {
      expect(isOwnerUser("wahyu.priyono@magnusdigital.co.id")).toBe(true);
      expect(isOwnerUser("wahyu@akusara.dev")).toBe(true);
      expect(isOwnerUser("wahyu.priyono@company.com")).toBe(true);
    });

    it("returns false for regular external users", () => {
      expect(isOwnerUser("alice@example.com")).toBe(false);
      expect(isOwnerUser("hendra@akusara.dev")).toBe(false);
      expect(isOwnerUser("bob@acme.org")).toBe(false);
      expect(isOwnerUser("")).toBe(false);
      expect(isOwnerUser(null)).toBe(false);
    });
  });

  describe("ensureWorkspace", () => {
    it("generates a UUID and unique slug when creating a new workspace", async () => {
      mocks.db.get
        .mockResolvedValueOnce(undefined) // existing by name
        .mockResolvedValueOnce(undefined) // unique slug check
        .mockResolvedValueOnce({ id: 10, name: "Acme QA", slug: "acme-qa", uuid: "ws-uuid-1" }); // created row

      const result = await ensureWorkspace("Acme QA", 5);

      expect(result).toEqual({ id: 10, name: "Acme QA", slug: "acme-qa", uuid: "ws-uuid-1" });
      expect(mocks.db.run).toHaveBeenCalledWith(
        'INSERT INTO "Workspace" ("name", "slug", "uuid", "createdByUserId") VALUES (?, ?, ?, CAST(? AS INTEGER))',
        ["Acme QA", "acme-qa", expect.any(String), 5],
      );
    });
  });

  describe("ensurePersonalWorkspaceForUser", () => {
    it("preserves Wahyu's existing workspace without creating a new one", async () => {
      const wahyuWs = { id: 15, name: "VanApp", slug: "vanapp", uuid: "vanapp-uuid" };
      mocks.db.get.mockResolvedValueOnce(wahyuWs);

      const result = await ensurePersonalWorkspaceForUser(9, "Wahyu Priyono", "wahyu.priyono@magnusdigital.co.id");

      expect(result).toEqual(wahyuWs);
      expect(mocks.db.run).toHaveBeenCalledWith(
        'UPDATE "User" SET "workspaceId" = CAST(? AS INTEGER), "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
        [15, 15, "VanApp", 9],
      );
    });

    it("creates an isolated personal workspace with UUID for non-Wahyu users", async () => {
      // 1. Check if user already owns a workspace -> none
      mocks.db.get
        .mockResolvedValueOnce(undefined) // ownedWs -> none
        .mockResolvedValueOnce(undefined) // nameExists -> none
        .mockResolvedValueOnce({
          id: 25,
          name: "Alice's Workspace",
          slug: "alice-s-workspace-12345678",
          uuid: "user-ws-uuid",
        }) // createdWs
        .mockResolvedValueOnce(undefined); // ensureWorkspaceMembership existing check

      const result = await ensurePersonalWorkspaceForUser(20, "Alice", "alice@example.com");

      expect(result).toMatchObject({
        id: 25,
        name: "Alice's Workspace",
      });

      // Verify workspace insertion had UUID and createdByUserId set
      expect(mocks.db.run).toHaveBeenCalledWith(
        'INSERT INTO "Workspace" ("name", "slug", "uuid", "createdByUserId") VALUES (?, ?, ?, CAST(? AS INTEGER))',
        ["Alice's Workspace", expect.stringMatching(/^alice-s-workspace-[a-f0-9]{8}$/), expect.any(String), 20],
      );

      // Verify accidental membership in default workspace 1 is purged
      expect(mocks.db.run).toHaveBeenCalledWith(
        'DELETE FROM "WorkspaceMembership" WHERE "workspaceId" = 1 AND "userId" = CAST(? AS INTEGER)',
        [20],
      );

      // Verify user's activeWorkspaceId is updated to their new isolated workspace
      expect(mocks.db.run).toHaveBeenCalledWith(
        'UPDATE "User" SET "workspaceId" = CAST(? AS INTEGER), "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
        [25, 25, "Alice's Workspace", 20],
      );
    });

    it("returns existing owned workspace if user already has one", async () => {
      const existingOwned = { id: 30, name: "Bob's Workspace", slug: "bob-s-workspace", uuid: "bob-uuid" };
      mocks.db.get
        .mockResolvedValueOnce(existingOwned) // ownedWs -> found
        .mockResolvedValueOnce({ id: 100 }); // membership existing check

      const result = await ensurePersonalWorkspaceForUser(15, "Bob", "bob@example.com");

      expect(result).toEqual(existingOwned);
      expect(mocks.db.run).toHaveBeenCalledWith(
        'UPDATE "User" SET "workspaceId" = CAST(? AS INTEGER), "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
        [30, 30, "Bob's Workspace", 15],
      );
    });
  });

  describe("getWorkspaceMembershipsForUser", () => {
    it("includes uuid in the query", async () => {
      mocks.db.query.mockResolvedValueOnce([
        {
          id: 1,
          workspaceId: 10,
          role: "admin",
          status: "active",
          name: "My WS",
          slug: "my-ws",
          uuid: "ws-uuid-abc",
          accentColor: "#2563eb",
          templateKey: "custom",
          iconPath: "",
          timezone: "Asia/Jakarta",
          sprintFormat: "Sprint {N}",
          createdByUserId: 5,
        },
      ]);

      const result = await getWorkspaceMembershipsForUser(5);

      expect(result[0]?.uuid).toBe("ws-uuid-abc");
      expect(mocks.db.query).toHaveBeenCalledWith(
        expect.stringContaining('w."uuid"'),
        [5],
      );
    });
  });
});
