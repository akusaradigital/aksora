import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  queryFirst: vi.fn(),
  queryRows: vi.fn(),
  codeFromId: vi.fn((prefix: string, id: number) => `${prefix}-${String(id).padStart(3, "0")}`),
}));

vi.mock("@/lib/utils", () => ({
  codeFromId: mocks.codeFromId,
}));

vi.mock("@/lib/roles", () => ({
  getRoleLabel: (role: string) => ({ ai: "AI Engineer", admin: "Super Admin", qa: "QA Engineer" }[role] || role),
}));

vi.mock("../search-helpers", () => ({
  buildResult: vi.fn(({ row, code, label, sublabel }: any) => ({ id: row.id, code, label, sublabel })),
  buildSearchSql: vi.fn(),
  escapeLike: (value: string) => value,
  extractExactId: vi.fn(),
  normalize: (value: string) => value,
  queryFirst: mocks.queryFirst,
  queryRows: mocks.queryRows,
}));

import { getUserResults } from "../search-user-results";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryFirst.mockResolvedValue(undefined);
  mocks.queryRows.mockResolvedValue([]);
});

describe("getUserResults", () => {
  it("uses human readable role labels", async () => {
    mocks.queryRows.mockResolvedValueOnce([
      { id: 2, name: "Rina", email: "rina@example.com", role: "ai", updatedAt: "2026-05-01" },
    ]);

    const results = await getUserResults("Rina", "", []);

    expect(results[0]).toMatchObject({
      code: "USR-002",
      sublabel: "rina@example.com · AI Engineer",
    });
  });
});
