import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbQuery: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: mocks.dbQuery,
  },
}));

import { broadcastCriticalBug, type CriticalBugAlert } from "@/lib/chat-broadcast";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.dbQuery.mockResolvedValue([]);
});

describe("chat-broadcast", () => {
  const alert: CriticalBugAlert = {
    company: "Acme",
    workspaceId: 1,
    title: "Database connection leak",
    severity: "critical",
    project: "Backend API",
    actor: "Wahyu",
    publicToken: "bug-token-123",
  };

  it("skips non-high-severity bugs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await broadcastCriticalBug({ ...alert, severity: "low" });
    await broadcastCriticalBug({ ...alert, severity: "medium" });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("sends Telegram message when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100123456789");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));

    await broadcastCriticalBug(alert);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Critical Bug Alert"),
      }),
    );

    fetchSpy.mockRestore();
  });

  it("sends Slack message when SLACK_WEBHOOK_URL is set", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/test");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));

    await broadcastCriticalBug(alert);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/test",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Database connection leak"),
      }),
    );

    fetchSpy.mockRestore();
  });
});
