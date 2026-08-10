import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/toast", () => ({
  toast: mocks.toast,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
}));

import { TestCaseDetailEditor, TestCaseGridRow } from "@/components/test-management/test-case-detail-editor";

describe("TestCaseDetailEditor", () => {
  it("renders existing rows and detail controls", () => {
    const html = renderToStaticMarkup(
      <TestCaseDetailEditor
        suiteId="9"
        suiteTitle="Checkout Suite"
        initialCases={[
          {
            id: 1,
            testSuiteId: "9",
            tcId: "TC-1",
            caseName: "Login works",
            typeCase: "Positive",
            preCondition: "User exists",
            testStep: "Open login page",
            expectedResult: "Dashboard opens",
            actualResult: "",
            status: "Pending",
            evidence: "",
            priority: "High",
          },
        ]}
      />,
    );

    expect(html).toContain("Test Case ID");
    expect(html).toContain("TC-1");
    expect(html).toContain("Login works");
    expect(html).toContain("Action");
    expect(html).toContain("#");
    expect(html).not.toContain("Ctrl+Enter");
  });

  it("shows save while editing and delete after commit", () => {
    const editingHtml = renderToStaticMarkup(
      <table>
        <tbody>
          <TestCaseGridRow
            row={{
              id: 1,
              testSuiteId: "9",
              tcId: "TC-1",
              caseName: "Login works",
              typeCase: "Positive",
              preCondition: "User exists",
              testStep: "Open login page",
              expectedResult: "Dashboard opens",
              actualResult: "",
              status: "Pending",
              evidence: "",
              priority: "High",
            }}
            index={0}
            rowKey="edit-1"
            mode="edit"
            canSave
            onEdit={() => undefined}
            onChange={() => undefined}
            onSave={() => undefined}
            onDelete={() => undefined}
            focusNext={() => undefined}
            focusPrevious={() => undefined}
          />
        </tbody>
      </table>,
    );

    const viewHtml = renderToStaticMarkup(
      <table>
        <tbody>
          <TestCaseGridRow
            row={{
              id: 1,
              testSuiteId: "9",
              tcId: "TC-1",
              caseName: "Login works",
              typeCase: "Positive",
              preCondition: "User exists",
              testStep: "Open login page",
              expectedResult: "Dashboard opens",
              actualResult: "",
              status: "Failed",
              evidence: "",
              priority: "High",
            }}
            index={0}
            rowKey="view-1"
            mode="view"
            onEdit={() => undefined}
            onChange={() => undefined}
            onSave={() => undefined}
            onDelete={() => undefined}
            onReportBug={() => undefined}
          />
        </tbody>
      </table>,
    );

    expect(editingHtml).toContain("Save");
    expect(viewHtml).toContain("title=\"Delete\"");
    expect(viewHtml).toContain("title=\"Report Bug\"");
  });

  it("applies full-cell tone fills", () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <TestCaseGridRow
            row={{
              id: 1,
              testSuiteId: "9",
              tcId: "TC-1",
              caseName: "Login works",
              typeCase: "Positive",
              preCondition: "User exists",
              testStep: "Open login page",
              expectedResult: "Dashboard opens",
              actualResult: "",
              status: "Passed",
              evidence: "",
              priority: "High",
            }}
            index={0}
            rowKey="view-1"
            mode="view"
            onEdit={() => undefined}
            onChange={() => undefined}
            onSave={() => undefined}
            onDelete={() => undefined}
            onReportBug={() => undefined}
          />
        </tbody>
      </table>,
    );

    expect(html).toContain("bg-emerald-100 text-emerald-700");
    expect(html).toContain("bg-orange-100 text-orange-700");
  });
});


