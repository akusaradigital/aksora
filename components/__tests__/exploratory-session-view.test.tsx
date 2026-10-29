/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ExploratorySessionView, type ExploratorySessionItem } from "../test-management/exploratory-session-view";

const mockSessions: ExploratorySessionItem[] = [
  {
    id: 1,
    title: "Voucher Discount Edge Cases",
    charter: "Explore checkout voucher combinations to uncover stacking discount glitches",
    project: "E-Commerce",
    environment: "staging",
    tester: "QA Lead",
    targetDurationMinutes: 45,
    actualDurationMinutes: 0,
    status: "in_progress",
    notes: "[10:00] Initial checkout page loaded",
    bugsFound: 1,
    startedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "OAuth Google Login Redirection",
    charter: "Verify token exchange edge cases",
    project: "Auth",
    environment: "production",
    tester: "Tester 2",
    targetDurationMinutes: 30,
    actualDurationMinutes: 28,
    status: "completed",
    notes: "",
    bugsFound: 0,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

describe("ExploratorySessionView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders live charter mission drawer and session cards", () => {
    render(<ExploratorySessionView initialSessions={mockSessions} />);

    expect(screen.getByText("Session-Based Exploratory Testing")).toBeTruthy();
    expect(screen.getByText("Live Charter Mission")).toBeTruthy();
    expect(screen.getAllByText("Voucher Discount Edge Cases").length).toBeGreaterThan(0);
    expect(screen.getByText("OAuth Google Login Redirection")).toBeTruthy();
  });

  it("filters sessions by status", () => {
    render(<ExploratorySessionView initialSessions={mockSessions} />);

    const completedTab = screen.getByRole("button", { name: "Completed" });
    fireEvent.click(completedTab);

    expect(screen.getByText("OAuth Google Login Redirection")).toBeTruthy();
  });

  it("records an observation note into active session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1, notes: "New observation" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExploratorySessionView initialSessions={mockSessions} />);

    const noteInput = screen.getByPlaceholderText(/Record an observation/i);
    fireEvent.change(noteInput, { target: { value: "Discovered NaN discount in subtotal" } });

    const recordBtn = screen.getByRole("button", { name: "Record" });
    fireEvent.click(recordBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/exploratory-sessions/1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Discovered NaN discount"),
        })
      );
    });
  });
});
