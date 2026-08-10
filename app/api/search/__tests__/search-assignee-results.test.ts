import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  queryFirst: vi.fn(),
  queryRows: vi.fn(),
  codeFromId: vi.fn((prefix: string, id: number) => `${prefix}-${String(id).padStart(3, "0")}`),
}));

vi.mock("@/lib/utils", () => ({
  codeFromId: mocks.codeFromId,
}));

vi.mock("../search-helpers", () => ({
  buildResult: vi.fn(({ row, code, label }: any) => ({ id: row.id, code, label })),
  buildSearchSql: vi.fn(),
  escapeLike: (value: string) => value,
  extractExactId: vi.fn(),
  normalize: (value: string) => value,
  queryFirst: mocks.queryFirst,
  queryRows: mocks.queryRows,
}));

import { getAssigneeResults } from "../search-assignee-results";
import { extractExactId, buildResult } from "../search-helpers";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryFirst.mockResolvedValue(undefined);
  mocks.queryRows.mockResolvedValue([]);
  vi.mocked(extractExactId).mockReturnValue(null);
});

describe("getAssigneeResults", () => {
  it("skips admin users", async () => {
    mocks.queryRows.mockResolvedValueOnce([
      { id: 1, name: "Admin User", role: "admin", email: "admin@example.com", status: "active", skills: "", updatedAt: "2026-05-01" },
      { id: 2, name: "Rina", role: "qa", email: "rina@example.com", status: "active", skills: "", updatedAt: "2026-05-01" },
    ]);

    const results = await getAssigneeResults("Rina", "", []);

    expect(results).toEqual([{ id: 2, code: "ASS-002", label: "Rina" }]);
    expect(buildResult).toHaveBeenCalledTimes(1);
  });

  it("skips exact admin matches", async () => {
    vi.mocked(extractExactId).mockReturnValueOnce(1);
    mocks.queryFirst.mockResolvedValueOnce({
      id: 1,
      name: "Admin User",
      role: "admin",
      email: "admin@example.com",
      status: "active",
      skills: "",
      updatedAt: "2026-05-01",
    });

    const results = await getAssigneeResults("ASS-1", "", []);

    expect(results).toEqual([]);
    expect(buildResult).not.toHaveBeenCalled();
  });
});
