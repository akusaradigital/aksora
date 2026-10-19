import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { run: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { POST } from "../route";

const SECRET = "test-webhook-secret";

function sign(body: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/webhooks/git", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/webhooks/git", () => {
  const originalSecret = process.env.GIT_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.run.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.GIT_WEBHOOK_SECRET;
    else process.env.GIT_WEBHOOK_SECRET = originalSecret;
  });

  it("rejects the request when GIT_WEBHOOK_SECRET is unset, even with no signature header (fails closed)", async () => {
    delete process.env.GIT_WEBHOOK_SECRET;
    const response = await POST(makeRequest(JSON.stringify({ commits: [] })));
    expect(response.status).toBe(401);
    expect(mocks.db.run).not.toHaveBeenCalled();
  });

  it("rejects a request with no signature header even when the secret is configured", async () => {
    process.env.GIT_WEBHOOK_SECRET = SECRET;
    const response = await POST(makeRequest(JSON.stringify({ commits: [] })));
    expect(response.status).toBe(401);
    expect(mocks.db.run).not.toHaveBeenCalled();
  });

  it("rejects a request with an invalid signature", async () => {
    process.env.GIT_WEBHOOK_SECRET = SECRET;
    const body = JSON.stringify({ commits: [] });
    const response = await POST(makeRequest(body, { "x-hub-signature-256": "sha256=deadbeef" }));
    expect(response.status).toBe(401);
    expect(mocks.db.run).not.toHaveBeenCalled();
  });

  it("accepts a request with a valid HMAC signature", async () => {
    process.env.GIT_WEBHOOK_SECRET = SECRET;
    const body = JSON.stringify({
      commits: [{ id: "abc123", message: "fix TASK-5", url: "https://example.com/commit/abc123" }],
      ref: "refs/heads/main",
    });
    const response = await POST(
      makeRequest(body, { "x-hub-signature-256": sign(body, SECRET), "x-github-event": "push" }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.updatedTasks).toEqual([5]);
  });
});
