import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    get: vi.fn(),
    query: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import {
  createWebhookForUser,
  deleteWebhook,
  dispatchWebhooks,
  generateWebhookSecret,
  listWebhooksForUser,
  signWebhookPayload,
} from "@/lib/webhooks";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.get.mockResolvedValue(undefined);
  mocks.db.query.mockResolvedValue([]);
  mocks.db.run.mockResolvedValue(undefined);
});

describe("webhooks", () => {
  it("generates a prefixed secret and signs payloads deterministically", () => {
    const secret = generateWebhookSecret();
    expect(secret.startsWith("whsec_")).toBe(true);

    const sig1 = signWebhookPayload("s3cret", '{"a":1}');
    const sig2 = signWebhookPayload("s3cret", '{"a":1}');
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64);
    expect(signWebhookPayload("other", '{"a":1}')).not.toBe(sig1);
  });

  it("rejects a non-http(s) url", async () => {
    await expect(createWebhookForUser(1, "acme", "ftp://bad")).rejects.toThrow(/valid http/i);
    expect(mocks.db.get).not.toHaveBeenCalled();
  });

  it("creates a webhook and returns the raw secret once", async () => {
    mocks.db.get.mockResolvedValueOnce({ id: 9 });
    const created = await createWebhookForUser(1, "acme", "https://example.com/hook", 3, ["tasks.created"]);
    expect(created.id).toBe(9);
    expect(created.secret.startsWith("whsec_")).toBe(true);
    expect(mocks.db.get).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "Webhook"'),
      [1, 3, "acme", "https://example.com/hook", expect.any(String), "tasks.created"],
    );
  });

  it("lists and deletes webhooks scoped to the owning user", async () => {
    await listWebhooksForUser(1);
    expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('FROM "Webhook"'), [1]);

    mocks.db.get.mockResolvedValueOnce({ id: 9 });
    await expect(deleteWebhook(1, 9)).resolves.toBe(true);

    mocks.db.get.mockResolvedValueOnce(undefined);
    await expect(deleteWebhook(1, 999)).resolves.toBe(false);
  });

  it("dispatches only to webhooks subscribed to the event and records success", async () => {
    mocks.db.query.mockResolvedValueOnce([
      { id: 1, url: "https://a.example.com", secret: "s1", events: "*", failureCount: 0 },
      { id: 2, url: "https://b.example.com", secret: "s2", events: "bug.created", failureCount: 0 },
      { id: 3, url: "https://c.example.com", secret: "s3", events: "task.updated", failureCount: 0 },
    ]);
    fetchMock.mockResolvedValue({ status: 200 });

    await dispatchWebhooks("acme", "bug.created", { entityId: "1" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("https://a.example.com");
    expect(calledUrls).toContain("https://b.example.com");
    expect(calledUrls).not.toContain("https://c.example.com");

    expect(mocks.db.run).toHaveBeenCalledWith(
      expect.stringContaining('"failureCount" = 0'),
      [200, 1],
    );
  });

  it("increments failureCount and includes a signature header on delivery", async () => {
    mocks.db.query.mockResolvedValueOnce([
      { id: 5, url: "https://dead.example.com", secret: "s5", events: "*", failureCount: 2 },
    ]);
    fetchMock.mockResolvedValue({ status: 500 });

    await dispatchWebhooks("acme", "task.deleted", { entityId: "7" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["X-Aksora-Signature"]).toHaveLength(64);

    expect(mocks.db.run).toHaveBeenCalledWith(
      expect.stringContaining('"failureCount" = ?'),
      [500, 3, 1, 5],
    );
  });

  it("auto-disables a webhook after too many consecutive failures", async () => {
    mocks.db.query.mockResolvedValueOnce([
      { id: 6, url: "https://dead.example.com", secret: "s6", events: "*", failureCount: 9 },
    ]);
    fetchMock.mockResolvedValue({ status: 500 });

    await dispatchWebhooks("acme", "task.deleted", { entityId: "8" });

    expect(mocks.db.run).toHaveBeenCalledWith(
      expect.stringContaining('"active" = ?'),
      [500, 10, 0, 6],
    );
  });

  it("does nothing when no webhooks match the event", async () => {
    mocks.db.query.mockResolvedValueOnce([]);
    await dispatchWebhooks("acme", "task.created", {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
