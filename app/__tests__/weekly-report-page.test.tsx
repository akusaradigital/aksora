import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pageShell: vi.fn(({ children, title }: { children: React.ReactNode; title: string }) => (
    <section data-testid="page-shell" data-title={title}>
      {children}
    </section>
  )),
  fetch: vi.fn(),
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

import WeeklyReportPage from "@/app/weekly-report/page";

beforeEach(() => {
  mocks.fetch.mockReset();
  globalThis.fetch = mocks.fetch as unknown as typeof fetch;
  mocks.fetch.mockImplementation(async () => ({
    ok: false,
    json: async () => ({ error: "weekly report unavailable" }),
  } as Response));
});

describe("weekly report page", () => {
  it("renders the skeleton fallback and fetches the report server-side", () => {
    // The report is fetched inside ReportContent, which suspends — static markup
    // resolves to the ReportSkeleton fallback while the server fetch runs.
    const loadingMarkup = renderToStaticMarkup(<WeeklyReportPage />);

    expect(loadingMarkup).toContain("data-testid=\"page-shell\"");
    expect(loadingMarkup).toContain("animate-pulse");
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/weekly-report?from="),
      { cache: "no-store" },
    );
    expect(mocks.pageShell).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Report" }),
      undefined,
    );
  });
});