/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock the toast module
vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

// Mock @phosphor-icons/react
vi.mock("@phosphor-icons/react", () => ({
  Link: (props: Record<string, unknown>) => (
    <svg data-testid="link-icon" {...props} />
  ),
  Check: (props: Record<string, unknown>) => (
    <svg data-testid="check-icon" {...props} />
  ),
}));

import { CopyLinkButton } from "@/components/shared/copy-link-button";
import { toast } from "@/components/ui/toast";

describe("CopyLinkButton", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock window.location.origin
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3000" },
      writable: true,
    });
    // Mock navigator.clipboard
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders Link icon by default", () => {
    render(<CopyLinkButton module="bugs" itemId={42} />);

    expect(screen.getByTestId("link-icon")).toBeDefined();
    expect(screen.queryByTestId("check-icon")).toBeNull();
  });

  it("clipboard write is called with correct URL on click", async () => {
    render(<CopyLinkButton module="tasks" itemId={123} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(writeTextMock).toHaveBeenCalledWith(
      "http://localhost:3000/tasks?view=123",
    );
  });

  it("icon changes to Check on successful copy", async () => {
    render(<CopyLinkButton module="bugs" itemId={7} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    // After successful copy, Check icon should be shown
    expect(screen.getByTestId("check-icon")).toBeDefined();
    expect(screen.queryByTestId("link-icon")).toBeNull();

    // After 2 seconds, it should revert back to Link icon
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("link-icon")).toBeDefined();
    expect(screen.queryByTestId("check-icon")).toBeNull();
  });

  it("shows success toast on successful copy", async () => {
    render(<CopyLinkButton module="bugs" itemId={7} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(toast).toHaveBeenCalledWith(
      "Link copied to clipboard",
      "success",
      { duration: 3000 },
    );
  });

  it("shows error toast when clipboard API fails", async () => {
    writeTextMock.mockRejectedValueOnce(new Error("Clipboard write failed"));

    render(<CopyLinkButton module="test-cases" itemId={99} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(toast).toHaveBeenCalledWith(
      "Could not copy link. Try copying the URL from the address bar.",
      "error",
      { duration: 5000 },
    );
    // Icon should remain as Link (not change to Check)
    expect(screen.getByTestId("link-icon")).toBeDefined();
    expect(screen.queryByTestId("check-icon")).toBeNull();
  });

  it("has correct aria-label when not copied", () => {
    render(<CopyLinkButton module="bugs" itemId={1} />);

    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Copy link");
  });

  it("has correct aria-label after successful copy", async () => {
    render(<CopyLinkButton module="bugs" itemId={1} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Link copied");
  });
});
