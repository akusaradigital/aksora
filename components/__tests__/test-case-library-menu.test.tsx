/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/badge", () => ({
  Badge: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
  formatDisplayText: (value: string) => value,
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-circle" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-circle" {...props} />,
  Warning: (props: Record<string, unknown>) => <svg data-testid="warning" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock" {...props} />,
  Checks: (props: Record<string, unknown>) => <svg data-testid="checks" {...props} />,
  DotsThreeVertical: (props: Record<string, unknown>) => <svg data-testid="dots" {...props} />,
  DotsSixVertical: (props: Record<string, unknown>) => <svg data-testid="dots-six" {...props} />,
  PencilSimple: (props: Record<string, unknown>) => <svg data-testid="pencil" {...props} />,
  Table: (props: Record<string, unknown>) => <svg data-testid="table" {...props} />,
}));

import { TestCaseLibrary } from "@/app/test-cases/test-case-library";

afterEach(() => {
  cleanup();
});

describe("TestCaseLibrary menu", () => {
  it("closes the three-dot menu when clicking outside", () => {
    render(
      <TestCaseLibrary
        cases={[
          {
            id: 1,
            tcId: "TS-001",
            caseName: "Register with valid email and password",
            typeCase: "Positive",
            preCondition: "",
            testStep: "",
            expectedResult: "",
            actualResult: "",
            status: "Passed",
            priority: "High",
            evidence: "",
            suiteTitle: "User Registration",
            suiteToken: "suite-1",
            suiteStatus: "active",
            planTitle: "Sprint 1",
            planProject: "ECOSHOP WEB",
            testSuiteId: 1,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open test case menu/i }));
    expect(screen.getByText("Edit Test Case")).not.toBeNull();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByText("Edit Test Case")).toBeNull();
  });
});
