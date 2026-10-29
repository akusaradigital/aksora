/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AiVisionInspector } from "../test-management/ai-vision-inspector";

describe("AiVisionInspector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders upload prompt and viewport selector", () => {
    render(
      <AiVisionInspector
        testCaseId={1}
        caseName="Checkout Payment Gateway"
        expectedResult="Receipt appears with 200 OK"
      />
    );

    expect(screen.getByText("AI Vision Test Inspector")).toBeTruthy();
    expect(screen.getByText("Checkout Payment Gateway")).toBeTruthy();
    expect(screen.getByText(/Upload or Paste Screenshot/)).toBeTruthy();
  });

  it("switches viewports correctly", () => {
    render(
      <AiVisionInspector
        testCaseId={1}
        caseName="Checkout Payment Gateway"
      />
    );

    const buttons = screen.getAllByRole("button");
    const mobileBtn = buttons.find((b) => b.textContent?.includes("Mobile"));
    expect(mobileBtn).toBeTruthy();
    if (mobileBtn) fireEvent.click(mobileBtn);

    expect(screen.getByRole("button", { name: /Verify with AI Vision \(mobile\)/i })).toBeTruthy();
  });

  it("calls API when screenshot exists and run button is clicked", async () => {
    const onApply = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          verdict: "Passed",
          confidence: 96,
          actualResult: "UI layout renders properly with zero text collisions",
          visualAssertions: [
            { check: "Button visibility", passed: true, observed: "Button is visible" },
          ],
          cosmeticAnomalies: [],
          providerUsed: "google",
          modelUsed: "gemini-2.0-flash",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AiVisionInspector
        testCaseId={5}
        caseName="Checkout Button"
        existingEvidence="data:image/png;base64,mock"
        onApplyVerdict={onApply}
      />
    );

    const verifyBtn = screen.getByRole("button", { name: /Verify with AI Vision/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/vision-test",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"testCaseId":5'),
        })
      );
      expect(onApply).toHaveBeenCalledWith(
        "Passed",
        expect.stringContaining("UI layout"),
        "data:image/png;base64,mock",
        expect.any(Object),
        "desktop"
      );
    });
  });
});
