import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    run: vi.fn(),
    query: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { syncAssigneeFromUser } from "@/lib/user-assignee-sync";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.run.mockResolvedValue(undefined);
  mocks.db.query.mockResolvedValue([]);
  mocks.db.get.mockResolvedValue(null);
});

describe("user assignee sync", () => {
  it("removes admin users from assignees", async () => {
    await syncAssigneeFromUser({
      id: 1,
      company: "acme",
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
    });

    expect(mocks.db.run).toHaveBeenCalledWith(
      'UPDATE "Assignee" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = ?',
      [1],
    );
    expect(mocks.db.run).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "Assignee"'),
      expect.any(Array),
    );
  });

  it("keeps assignable users synced", async () => {
    await syncAssigneeFromUser({
      id: 2,
      company: "acme",
      name: "Rina",
      email: "rina@example.com",
      role: "qa",
    });

    expect(mocks.db.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "Assignee"'),
      ["acme", 2, "Rina", "qa", "rina@example.com", "", "active"],
    );
  });
});
