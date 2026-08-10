import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryFirst: vi.fn(),
  queryRows: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  codeFromId: (prefix: string, id: number) => `${prefix}-${String(id).padStart(3, "0")}`,
}));

vi.mock("../search-helpers", () => ({
  buildFilterClause: vi.fn(() => ({ clause: "", params: [] })),
  buildResult: vi.fn(({ row, href, label, code, sublabel }: any) => ({
    id: row.id,
    href,
    label,
    code,
    sublabel,
  })),
  buildSearchSql: vi.fn(),
  escapeLike: (value: string) => value,
  extractExactId: vi.fn(),
  mergeRowsById: vi.fn((primaryRows: any[], secondaryRows: any[]) => [...primaryRows, ...secondaryRows]),
  normalize: (value: unknown) => String(value ?? ""),
  queryFirst: mocks.queryFirst,
  queryRows: mocks.queryRows,
}));

import { extractExactId } from "../search-helpers";
import { getTestCaseResults } from "../search-test-case-results";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryFirst.mockResolvedValue(undefined);
  mocks.queryRows.mockResolvedValue([]);
  vi.mocked(extractExactId).mockReturnValue(null);
});

describe("getTestCaseResults", () => {
  it("links search results to the test case detail page", async () => {
    mocks.queryRows.mockResolvedValueOnce([
      {
        id: 12,
        tcId: "TC-012",
        caseName: "Login works",
        suiteTitle: "Auth Suite",
        suiteToken: "suite-abc",
        planTitle: "Sprint Plan",
        priority: "High",
        status: "Passed",
        testStep: "Open login page",
        expectedResult: "Dashboard opens",
        preCondition: "User exists",
      },
    ]);

    const results = await getTestCaseResults("Login", "", []);

    expect(results[0]).toEqual(
      expect.objectContaining({
        href: "/test-cases/detail/suite-abc",
        label: "Login works",
        code: "TC-012",
      }),
    );
  });
});
