/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbGet: vi.fn(),
  dbQuery: vi.fn(),
  healthInfo: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { get: mocks.dbGet, query: mocks.dbQuery },
  getDbHealthInfo: mocks.healthInfo,
}));

vi.mock("@/lib/email", () => ({
  emailEnabled: () => true,
  sendEmail: mocks.sendEmail,
}));

import { GET } from "@/app/api/cron/health-monitor/route";
import type { NextRequest } from "next/server";

function req() {
  return { headers: { get: (k: string) => (k === "authorization" ? "Bearer secret" : null) } } as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.CRON_SECRET = "secret";
  mocks.sendEmail.mockResolvedValue({ ok: true });
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("health-monitor cron", () => {
  it("rejects without the CRON_SECRET header", async () => {
    const m = await GET({ headers: { get: () => null } } as unknown as NextRequest);
    expect(m.status).toBe(401);
  });

  it("returns healthy and does not email when nothing breaches", async () => {
    mocks.dbGet.mockResolvedValue({ ok: 1 });
    mocks.healthInfo.mockResolvedValue({
      conn: { total: 2, idle: 8, waiting: 0, max: 10 },
      tables: {},
    });
    const m = await GET(req());
    const body = await m.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("alerts when the DB is unreachable", async () => {
    mocks.dbGet.mockRejectedValue(new Error("connection refused"));
    process.env.HEALTH_ALERT_EMAIL = "ops@example.com";
    const m = await GET(req());
    const body = await m.json();
    expect(body.status).toBe("down");
    expect(body.checks[0]).toContain("DB unreachable");
    expect(mocks.sendEmail).toHaveBeenCalled();
    delete process.env.HEALTH_ALERT_EMAIL;
  });

  it("alerts on high latency", async () => {
    mocks.dbGet.mockResolvedValue({ ok: 1 });
    mocks.healthInfo.mockResolvedValue({
      conn: { total: 1, idle: 1, waiting: 0, max: 10 },
      tables: {},
    });
    // First Date.now() (start) = 0, second (after query) = 2000 → 2000ms latency.
    const now = vi.spyOn(Date, "now");
    now.mockReturnValueOnce(0).mockReturnValue(2000);
    process.env.HEALTH_ALERT_EMAIL = "ops@example.com";
    const m = await GET(req());
    const body = await m.json();
    expect(body.checks[0]).toContain("latency 2000ms");
    expect(mocks.sendEmail).toHaveBeenCalled();
    now.mockRestore();
    delete process.env.HEALTH_ALERT_EMAIL;
  });

  it("alerts when the pool is saturated", async () => {
    mocks.dbGet.mockResolvedValue({ ok: 1 });
    mocks.healthInfo.mockResolvedValue({
      conn: { total: 10, idle: 0, waiting: 3, max: 10 },
      tables: {},
    });
    process.env.HEALTH_ALERT_EMAIL = "ops@example.com";
    const m = await GET(req());
    const body = await m.json();
    expect(body.checks[0]).toContain("pool saturated");
    expect(mocks.sendEmail).toHaveBeenCalled();
    delete process.env.HEALTH_ALERT_EMAIL;
  });

  it("does not email when no alert recipient is configured", async () => {
    mocks.dbGet.mockRejectedValue(new Error("down"));
    const m = await GET(req());
    const body = await m.json();
    expect(body.emailSkipped).toBe(true);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});