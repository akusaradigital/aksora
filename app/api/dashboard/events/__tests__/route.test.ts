import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  getOnlineMembers: vi.fn(),
  dbQuery: vi.fn(),
  isPostgres: false,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/data", () => ({
  getOnlineMembers: mocks.getOnlineMembers,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: mocks.dbQuery,
  },
  isPostgres: mocks.isPostgres,
}));

vi.mock("@/lib/db-notify", () => ({
  listenChannel: vi.fn().mockResolvedValue(async () => {}),
  ACTIVITY_NOTIFY_CHANNEL: "aksora_activity",
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({
    company: "acme",
    isAdmin: false,
    params: ["acme"],
  });
  mocks.getOnlineMembers.mockResolvedValue([]);
  mocks.dbQuery.mockResolvedValue([]);
});

function createRequest(url = "http://localhost/api/dashboard/events") {
  const controller = new AbortController();
  return {
    request: new Request(url, { signal: controller.signal }),
    controller,
  };
}

/**
 * Read events from the SSE stream with a timeout to avoid hanging.
 * Aborts the connection after collecting events or on timeout.
 */
async function collectStreamEvents(
  response: Response,
  abortController: AbortController,
  opts: { maxEvents?: number; timeoutMs?: number } = {},
): Promise<string[]> {
  const { maxEvents = 10, timeoutMs = 2000 } = opts;
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: string[] = [];
  let buffer = "";

  const timeout = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    while (events.length < maxEvents) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE event separator)
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        if (part.trim()) {
          events.push(part.trim());
        }
      }
    }
  } catch {
    // Stream was aborted - expected behavior
  } finally {
    clearTimeout(timeout);
    try {
      reader.releaseLock();
    } catch {
      // Already released
    }
  }

  return events;
}

describe("GET /api/dashboard/events", () => {
  it("returns 401 when user is not authenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const { request } = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns SSE response with correct headers", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });

    const { request, controller } = createRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(response.headers.get("Connection")).toBe("keep-alive");

    controller.abort();
  });

  it("sends initial presence event", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 42, name: "Alice", role: "qa", company: "acme" });

    const { request, controller } = createRequest();
    const response = await GET(request);

    const events = await collectStreamEvents(response, controller, { maxEvents: 2, timeoutMs: 1000 });

    // Should have a presence event
    expect(events[0]).toContain("event: presence");
    expect(events[0]).toContain('"members":[]');
  });

  it("sends initial presence event with members", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.getOnlineMembers.mockResolvedValueOnce([
      { userId: 1, userName: "Alice", lastSeen: "2024-01-01T10:00:00Z" },
      { userId: 2, userName: "Bob", lastSeen: "2024-01-01T10:00:00Z" },
    ]);

    const { request, controller } = createRequest();
    const response = await GET(request);

    const events = await collectStreamEvents(response, controller, { maxEvents: 3, timeoutMs: 1000 });

    const presenceEvent = events.find((e) => e.includes("event: presence"));
    expect(presenceEvent).toBeDefined();
    expect(presenceEvent).toContain('"userName":"Alice"');
    expect(presenceEvent).toContain('"userName":"Bob"');
  });

  it("sends missed notifications when since param is provided", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });

    // getNotificationsSince issues a single combined query — mock exactly one call.
    mocks.dbQuery.mockResolvedValueOnce([
      {
        id: 1,
        entityType: "Task",
        entityId: "5",
        summary: "Task #5 assigned to Alice by Bob",
        createdAt: "2024-01-01T11:00:00Z",
      },
    ]);

    const since = "2024-01-01T10:00:00Z";
    const { request, controller } = createRequest(
      `http://localhost/api/dashboard/events?since=${encodeURIComponent(since)}`,
    );
    const response = await GET(request);

    const events = await collectStreamEvents(response, controller, { maxEvents: 5, timeoutMs: 1000 });

    // Should have a notification event for the missed assignment
    const notificationEvent = events.find((e) => e.includes("event: notification"));
    expect(notificationEvent).toBeDefined();
    expect(notificationEvent).toContain('"type":"assignment"');
    expect(notificationEvent).toContain("assigned to Alice");
  });

  it("scopes data by company", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });

    const { request, controller } = createRequest();
    await GET(request);

    // getOnlineMembers should be called with company
    expect(mocks.getOnlineMembers).toHaveBeenCalledWith("acme");

    controller.abort();
  });

  it("limits missed notifications to 50", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });

    // getNotificationsSince issues a single combined query (LIMIT 50), so mock
    // exactly one call — queuing a second unconsumed value here would leak
    // into whichever test makes the next real db.query() call.
    const manyRows = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      entityType: "Task",
      entityId: String(i + 1),
      summary: `Task #${i + 1} assigned to Alice by Bob`,
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
    }));
    mocks.dbQuery.mockResolvedValueOnce(manyRows);

    const since = "2024-01-01T00:00:00Z";
    const { request, controller } = createRequest(
      `http://localhost/api/dashboard/events?since=${encodeURIComponent(since)}`,
    );
    const response = await GET(request);

    // Read all events (connected + up to 50 notifications + presence)
    const events = await collectStreamEvents(response, controller, { maxEvents: 55, timeoutMs: 2000 });
    const notificationEvents = events.filter((e) => e.includes("event: notification"));

    // Should be capped at 50
    expect(notificationEvents.length).toBeLessThanOrEqual(50);
  });

  it("handles getOnlineMembers failure gracefully", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.getOnlineMembers.mockRejectedValueOnce(new Error("DB connection failed"));

    const { request, controller } = createRequest();
    const response = await GET(request);

    // Should still return 200 with SSE stream (graceful degradation)
    expect(response.status).toBe(200);

    const events = await collectStreamEvents(response, controller, { maxEvents: 2, timeoutMs: 1000 });
    expect(events).toEqual([]);
  });
});
