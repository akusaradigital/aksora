/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExecutionMatrixView, type MatrixCaseItem } from "../test-management/execution-matrix-view";

const mockCases: MatrixCaseItem[] = [
  {
    verdictId: 1,
    testCaseId: 101,
    tcId: "TC-101",
    caseName: "Login Responsive Form",
    preCondition: "User is on /login",
    testStep: "Check form alignment",
    expectedResult: "Form inputs do not overlap",
    actualResult: "",
    verdict: "Pending",
    evidence: "",
    duration: 10,
    priority: "High",
    typeCase: "Functional",
    matrix: JSON.stringify({
      desktop: { verdict: "Passed" },
      tablet: { verdict: "Passed" },
      mobile: { verdict: "Failed" },
    }),
  },
];

describe("ExecutionMatrixView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders viewport columns for desktop, tablet, and mobile", () => {
    const onUpdate = vi.fn();
    const onApplyAi = vi.fn();

    render(
      <ExecutionMatrixView
        runId={1}
        items={mockCases}
        isCompleted={false}
        onUpdateViewportVerdict={onUpdate}
        onApplyAiVerdict={onApplyAi}
      />
    );

    expect(screen.getByText(/Desktop/)).toBeTruthy();
    expect(screen.getByText(/Tablet/)).toBeTruthy();
    expect(screen.getByText(/Mobile/)).toBeTruthy();
    expect(screen.getByText("TC-101")).toBeTruthy();
    expect(screen.getByText("Login Responsive Form")).toBeTruthy();
  });

  it("cycles viewport verdict when clicked", () => {
    const onUpdate = vi.fn();
    const onApplyAi = vi.fn();

    render(
      <ExecutionMatrixView
        runId={1}
        items={mockCases}
        isCompleted={false}
        onUpdateViewportVerdict={onUpdate}
        onApplyAiVerdict={onApplyAi}
      />
    );

    const passedButtons = screen.getAllByRole("button", { name: /Passed/i });
    fireEvent.click(passedButtons[0]);

    expect(onUpdate).toHaveBeenCalledWith(101, "desktop", "Failed");
  });

  it("opens AI Vision modal when AI Vision button is clicked", () => {
    const onUpdate = vi.fn();
    const onApplyAi = vi.fn();

    render(
      <ExecutionMatrixView
        runId={1}
        items={mockCases}
        isCompleted={false}
        onUpdateViewportVerdict={onUpdate}
        onApplyAiVerdict={onApplyAi}
      />
    );

    const aiBtn = screen.getByRole("button", { name: /AI Vision/i });
    fireEvent.click(aiBtn);

    expect(screen.getByText("AI Vision Test Inspector")).toBeTruthy();
  });
});
