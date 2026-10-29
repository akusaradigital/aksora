/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CanaryHealthWidget } from "../dashboard/canary-health-widget";

describe("CanaryHealthWidget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("fetches and renders canary endpoints with latency badges", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 1,
            name: "Staging API Gateway",
            environment: "staging",
            url: "https://staging.example.com/health",
            method: "GET",
            expectedStatus: 200,
            lastStatus: 200,
            lastLatencyMs: 84,
            isHealthy: true,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CanaryHealthWidget />);

    await waitFor(() => {
      expect(screen.getByText("Staging API Gateway")).toBeTruthy();
      expect(screen.getByText("84ms")).toBeTruthy();
      expect(screen.getByText("HTTP 200")).toBeTruthy();
      expect(screen.getByText("1/1 endpoints operational")).toBeTruthy();
    });
  });

  it("triggers ping all when Ping All is clicked", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/canary") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                name: "Staging API",
                environment: "staging",
                url: "https://staging.example.com",
                isHealthy: true,
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CanaryHealthWidget />);

    await waitFor(() => {
      expect(screen.getByText("Staging API")).toBeTruthy();
    });

    const pingAllBtn = screen.getByRole("button", { name: /Ping All/i });
    fireEvent.click(pingAllBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/canary/ping-all", { method: "POST" });
    });
  });
});
