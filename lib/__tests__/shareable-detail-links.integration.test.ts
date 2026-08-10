/**
 * Integration tests for the shareable detail links flow.
 *
 * Tests the interaction between URL utility functions and the useDetailViewUrl hook,
 * verifying the full flow: URL → parse → find row → open modal → close → URL update.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 3.1, 3.4
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDetailViewUrl } from "@/hooks/use-detail-view-url";
import { buildShareableUrl, parseViewId } from "@/lib/shareable-url";
import type { ModuleKey } from "@/lib/modules";

// --- Mocks ---

// Mock window.history
const pushStateSpy = vi.fn();
const replaceStateSpy = vi.fn();

// Track current URL state for the test
let currentSearch = "";
let currentPathname = "/tasks";

function setTestUrl(pathname: string, search: string) {
  currentPathname = pathname;
  currentSearch = search;
}

beforeEach(() => {
  // Setup window.location mock
  Object.defineProperty(window, "location", {
    writable: true,
    value: {
      get pathname() {
        return currentPathname;
      },
      get search() {
        return currentSearch;
      },
      get origin() {
        return "http://localhost:3000";
      },
      get href() {
        return `http://localhost:3000${currentPathname}${currentSearch}`;
      },
    },
  });

  // Setup history mock
  window.history.pushState = pushStateSpy.mockImplementation((_state, _title, url) => {
    if (url) {
      const urlObj = new URL(url as string, "http://localhost:3000");
      currentPathname = urlObj.pathname;
      currentSearch = urlObj.search;
    }
  });
  window.history.replaceState = replaceStateSpy.mockImplementation((_state, _title, url) => {
    if (url) {
      const urlObj = new URL(url as string, "http://localhost:3000");
      currentPathname = urlObj.pathname;
      currentSearch = urlObj.search;
    }
  });

  // Reset fetch mock
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  currentSearch = "";
  currentPathname = "/tasks";
});

// --- Test Data ---

type Row = Record<string, string | number> & { id: string | number };

const sampleRows: Row[] = [
  { id: 1, title: "Fix login bug", status: "open" },
  { id: 2, title: "Add pagination", status: "done" },
  { id: 3, title: "Update docs", status: "todo" },
];

// --- Integration Tests ---

describe("Shareable Detail Links - Integration", () => {
  describe("Navigating to /{module}?view={id} opens the detail modal", () => {
    it("opens the modal when navigating to a URL with a valid view param and row exists locally", async () => {
      setTestUrl("/tasks", "?view=2");

      const onOpenRow = vi.fn();
      const onCloseRow = vi.fn();
      const onNotFound = vi.fn();
      const onAccessDenied = vi.fn();

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: null,
          initialViewId: "2",
          localRows: sampleRows,
          onOpenRow,
          onCloseRow,
          onNotFound,
          onAccessDenied,
        }),
      );

      // Should find row with id=2 in localRows and call onOpenRow
      expect(onOpenRow).toHaveBeenCalledWith(sampleRows[1]);
      expect(onNotFound).not.toHaveBeenCalled();
    });

    it("fetches from API when row is not in localRows and opens modal on success", async () => {
      setTestUrl("/bugs", "?view=99");

      const fetchedItem = { id: 99, title: "Remote bug", status: "open" };
      const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/resolve-view?")) {
          return { ok: true, json: () => Promise.resolve({ publicToken: "pk-99" }) } as Response;
        }
        if (url.startsWith("/api/items/bugs/")) {
          return { ok: true, json: () => Promise.resolve({ item: fetchedItem }) } as Response;
        }
        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const onOpenRow = vi.fn();
      const onNotFound = vi.fn();

      renderHook(() =>
        useDetailViewUrl({
          module: "bugs",
          viewingRow: null,
          initialViewId: "99",
          localRows: sampleRows,
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound,
          onAccessDenied: vi.fn(),
        }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/resolve-view?module=bugs&id=99");
      });

      await waitFor(() => {
        expect(onOpenRow).toHaveBeenCalledWith(fetchedItem);
      });
    });

    it("uses replaceState (not pushState) when opening from initial URL load", async () => {
      setTestUrl("/tasks", "?view=1");

      const onOpenRow = vi.fn();

      const { rerender } = renderHook(
        ({ viewingRow }) =>
          useDetailViewUrl({
            module: "tasks",
            viewingRow,
            initialViewId: "1",
            localRows: sampleRows,
            onOpenRow,
            onCloseRow: vi.fn(),
            onNotFound: vi.fn(),
            onAccessDenied: vi.fn(),
          }),
        { initialProps: { viewingRow: null as Row | null } },
      );

      // Simulate the modal opening (as if onOpenRow triggered setViewingRow)
      rerender({ viewingRow: sampleRows[0] });

      expect(replaceStateSpy).toHaveBeenCalled();
      // Should NOT push a new history entry for URL-initiated opens
      expect(pushStateSpy).not.toHaveBeenCalled();
    });
  });

  describe("Closing the modal removes the ?view param from URL", () => {
    it("pushes a new history entry without ?view when modal is closed", () => {
      setTestUrl("/tasks", "?view=1");

      const { rerender } = renderHook(
        ({ viewingRow }) =>
          useDetailViewUrl({
            module: "tasks",
            viewingRow,
            initialViewId: null,
            localRows: sampleRows,
            onOpenRow: vi.fn(),
            onCloseRow: vi.fn(),
            onNotFound: vi.fn(),
            onAccessDenied: vi.fn(),
          }),
        { initialProps: { viewingRow: sampleRows[0] as Row | null } },
      );

      // Simulate closing the modal
      rerender({ viewingRow: null });

      expect(pushStateSpy).toHaveBeenCalled();
      // The URL should no longer have ?view
      const lastCall = pushStateSpy.mock.calls[pushStateSpy.mock.calls.length - 1];
      const newUrl = lastCall[2] as string;
      expect(newUrl).not.toContain("view=");
    });

    it("preserves other query params when removing ?view", () => {
      setTestUrl("/tasks", "?page=2&q=search&view=1");

      const { rerender } = renderHook(
        ({ viewingRow }) =>
          useDetailViewUrl({
            module: "tasks",
            viewingRow,
            initialViewId: null,
            localRows: sampleRows,
            onOpenRow: vi.fn(),
            onCloseRow: vi.fn(),
            onNotFound: vi.fn(),
            onAccessDenied: vi.fn(),
          }),
        { initialProps: { viewingRow: sampleRows[0] as Row | null } },
      );

      // Simulate closing the modal
      rerender({ viewingRow: null });

      expect(pushStateSpy).toHaveBeenCalled();
      const lastCall = pushStateSpy.mock.calls[pushStateSpy.mock.calls.length - 1];
      const newUrl = lastCall[2] as string;
      expect(newUrl).toContain("page=2");
      expect(newUrl).toContain("q=search");
      expect(newUrl).not.toContain("view=");
    });
  });

  describe("Non-existent item ID shows toast notification", () => {
    it("calls onNotFound when API returns 404 for non-existent item", async () => {
      setTestUrl("/tasks", "?view=9999");

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal("fetch", fetchMock);

      const onNotFound = vi.fn();
      const onOpenRow = vi.fn();

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: null,
          initialViewId: "9999",
          localRows: [], // Not in local rows
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound,
          onAccessDenied: vi.fn(),
        }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/resolve-view?module=tasks&id=9999");
      });

      await waitFor(() => {
        expect(onNotFound).toHaveBeenCalled();
      });

      expect(onOpenRow).not.toHaveBeenCalled();
    });

    it("calls onNotFound (not onAccessDenied) when resolve-view rejects a cross-company item", async () => {
      setTestUrl("/bugs", "?view=50");

      // resolve-view filters by company, so a cross-company row simply 404s —
      // existence of the row is not leaked.
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal("fetch", fetchMock);

      const onAccessDenied = vi.fn();
      const onNotFound = vi.fn();
      const onOpenRow = vi.fn();

      renderHook(() =>
        useDetailViewUrl({
          module: "bugs",
          viewingRow: null,
          initialViewId: "50",
          localRows: [],
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound,
          onAccessDenied,
        }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/resolve-view?module=bugs&id=50");
      });

      await waitFor(() => {
        expect(onNotFound).toHaveBeenCalled();
      });

      expect(onAccessDenied).not.toHaveBeenCalled();
      expect(onOpenRow).not.toHaveBeenCalled();
    });
  });

  describe("Token-based view param triggers fetch when not found locally", () => {
    it("fetches from API when view param is a token not found in localRows", () => {
      setTestUrl("/tasks", "?view=abc");

      const onOpenRow = vi.fn();
      const onNotFound = vi.fn();
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
      vi.stubGlobal("fetch", fetchMock);

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: null,
          initialViewId: "abc",
          localRows: sampleRows,
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound,
          onAccessDenied: vi.fn(),
        }),
      );

      // parseViewId("abc") returns "abc", so it tries to find in localRows then fetches
      expect(onOpenRow).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith("/api/items/tasks/abc");
    });

    it("fetches from API when view param is negative (treated as token)", () => {
      setTestUrl("/tasks", "?view=-5");

      const onOpenRow = vi.fn();
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
      vi.stubGlobal("fetch", fetchMock);

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: null,
          initialViewId: "-5",
          localRows: sampleRows,
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound: vi.fn(),
          onAccessDenied: vi.fn(),
        }),
      );

      expect(onOpenRow).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith("/api/items/tasks/-5");
    });

    it("fetches from API when view param is a float (treated as token)", () => {
      setTestUrl("/tasks", "?view=3.14");

      const onOpenRow = vi.fn();
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
      vi.stubGlobal("fetch", fetchMock);

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: null,
          initialViewId: "3.14",
          localRows: sampleRows,
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound: vi.fn(),
          onAccessDenied: vi.fn(),
        }),
      );

      expect(onOpenRow).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith("/api/items/tasks/3.14");
    });

    it("does not open modal when view param is empty string", () => {
      setTestUrl("/tasks", "?view=");

      const onOpenRow = vi.fn();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: null,
          initialViewId: "",
          localRows: sampleRows,
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound: vi.fn(),
          onAccessDenied: vi.fn(),
        }),
      );

      expect(onOpenRow).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("All 11 modules produce correct URL format", () => {
    const allModules: ModuleKey[] = [
      "tasks",
      "bugs",
      "test-cases",
      "test-plans",
      "test-sessions",
      "test-suites",
      "meeting-notes",
      "sprints",
      "deployments",
      "assignees",
      "users",
    ];

    it.each(allModules)(
      "module '%s' produces URL in format origin/{module}?view={id}",
      (module) => {
        const origin = "http://localhost:3000";
        const id = 42;
        const url = buildShareableUrl(origin, module, id);

        expect(url).toBe(`${origin}/${module}?view=${id}`);

        // Verify the URL is parseable and the view param can be extracted
        const urlObj = new URL(url);
        expect(urlObj.pathname).toBe(`/${module}`);
        expect(urlObj.searchParams.get("view")).toBe(String(id));

        // Verify parseViewId can extract the ID back
        const parsedId = parseViewId(urlObj.searchParams.get("view"));
        expect(parsedId).toBe(String(id));
      },
    );

    it.each(allModules)(
      "module '%s' hook updates URL correctly when opening a row",
      (module) => {
        setTestUrl(`/${module}`, "");

        const row: Row = { id: 7, title: "Test item" };

        const { rerender } = renderHook(
          ({ viewingRow }) =>
            useDetailViewUrl({
              module,
              viewingRow,
              initialViewId: null,
              localRows: [row],
              onOpenRow: vi.fn(),
              onCloseRow: vi.fn(),
              onNotFound: vi.fn(),
              onAccessDenied: vi.fn(),
            }),
          { initialProps: { viewingRow: null as Row | null } },
        );

        // Simulate opening the row (user click)
        rerender({ viewingRow: row });

        expect(pushStateSpy).toHaveBeenCalled();
        const lastCall = pushStateSpy.mock.calls[pushStateSpy.mock.calls.length - 1];
        const newUrl = lastCall[2] as string;
        expect(newUrl).toBe(`/${module}?view=7`);

        // Reset for next iteration
        pushStateSpy.mockClear();
        replaceStateSpy.mockClear();
      },
    );
  });

  describe("Full open/close round-trip flow", () => {
    it("opening via user click pushes URL, closing removes it", () => {
      setTestUrl("/tasks", "");

      const row: Row = { id: 5, title: "Round trip test" };

      const { rerender } = renderHook(
        ({ viewingRow }) =>
          useDetailViewUrl({
            module: "tasks",
            viewingRow,
            initialViewId: null,
            localRows: [row],
            onOpenRow: vi.fn(),
            onCloseRow: vi.fn(),
            onNotFound: vi.fn(),
            onAccessDenied: vi.fn(),
          }),
        { initialProps: { viewingRow: null as Row | null } },
      );

      // Open the modal
      rerender({ viewingRow: row });

      expect(pushStateSpy).toHaveBeenCalledTimes(1);
      expect(currentSearch).toBe("?view=5");

      // Close the modal
      rerender({ viewingRow: null });

      expect(pushStateSpy).toHaveBeenCalledTimes(2);
      expect(currentSearch).toBe("");
      expect(currentPathname).toBe("/tasks");
    });

    it("popstate event triggers modal close when URL loses ?view", () => {
      setTestUrl("/tasks", "?view=1");

      const onCloseRow = vi.fn();

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: sampleRows[0],
          initialViewId: null,
          localRows: sampleRows,
          onOpenRow: vi.fn(),
          onCloseRow,
          onNotFound: vi.fn(),
          onAccessDenied: vi.fn(),
        }),
      );

      // Simulate back button: URL changes to no ?view, then popstate fires
      setTestUrl("/tasks", "");
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      expect(onCloseRow).toHaveBeenCalled();
    });

    it("popstate event triggers modal open when URL gains ?view", () => {
      setTestUrl("/tasks", "");

      const onOpenRow = vi.fn();

      renderHook(() =>
        useDetailViewUrl({
          module: "tasks",
          viewingRow: null,
          initialViewId: null,
          localRows: sampleRows,
          onOpenRow,
          onCloseRow: vi.fn(),
          onNotFound: vi.fn(),
          onAccessDenied: vi.fn(),
        }),
      );

      // Simulate forward button: URL changes to have ?view=2, then popstate fires
      setTestUrl("/tasks", "?view=2");
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      expect(onOpenRow).toHaveBeenCalledWith(sampleRows[1]);
    });
  });
});
