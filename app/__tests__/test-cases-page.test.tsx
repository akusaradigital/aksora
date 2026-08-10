import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  pageShell: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  testCaseLibrary: vi.fn(() => <div data-testid="test-case-library" />),
  getAllTestCasesWithSuite: vi.fn(),
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

vi.mock("@/lib/data", () => ({
  getAllTestCasesWithSuite: mocks.getAllTestCasesWithSuite,
}));

vi.mock("@/app/test-cases/test-case-library", () => ({
  TestCaseLibrary: mocks.testCaseLibrary,
}));

import TestCasesPage from "@/app/test-cases/page";

describe("test cases page", () => {
  it("renders the library with the parsed search query", async () => {
    mocks.getAllTestCasesWithSuite.mockResolvedValueOnce([
      {
        id: 1,
        tcId: "TC-1",
        caseName: "Login works",
        status: "Passed",
      },
    ]);

    const element = await (TestCasesPage as unknown as (args: {
      searchParams: Promise<Record<string, string | string[] | undefined>>;
    }) => Promise<React.ReactElement>)({
      searchParams: Promise.resolve({ q: ["login", "ignored"] }),
    });

    const html = renderToStaticMarkup(element);

    expect(html).toContain("test-case-library");
    expect(mocks.getAllTestCasesWithSuite).toHaveBeenCalled();
    expect(mocks.testCaseLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        initialSearch: "login",
        cases: [
          {
            id: 1,
            tcId: "TC-1",
            caseName: "Login works",
            status: "Passed",
          },
        ],
      }),
      undefined,
    );
    expect(mocks.pageShell).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Case Library",
        description: "All test cases across every suite. Filter by status, review assignee ownership, and jump directly to execution.",
      }),
      undefined,
    );
  });
});

