import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbGet: vi.fn(),
  getDbHealthInfo: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({
  db: { get: mocks.dbGet },
  getDbHealthInfo: mocks.getDbHealthInfo,
}));

import { GET } from "../route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.dbGet.mockResolvedValue({ ok: 1 });
  mocks.getDbHealthInfo.mockResolvedValue({ connections: { total: 1 }, tableCounts: { User: 5 } });
});

describe("GET /api/health", () => {
  it("does not leak memory/pool/table diagnostics to an unauthenticated caller", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.memory).toBeUndefined();
    expect(body.connections).toBeUndefined();
    expect(body.tableCounts).toBeUndefined();
  });

  it("does not leak the raw DB error message to an unauthenticated caller on failure", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    mocks.dbGet.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.error).toBeUndefined();
    expect(body.memory).toBeUndefined();
  });

  it("includes diagnostics for an authenticated management admin", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.memory).toBeDefined();
    expect(body.connections).toEqual({ total: 1 });
  });

  it("includes the raw error for an authenticated management admin on failure", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
    mocks.dbGet.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toBe("connect ECONNREFUSED 10.0.0.5:5432");
  });

  it("does not leak diagnostics to a non-admin authenticated caller", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    const res = await GET();
    const body = await res.json();
    expect(body.memory).toBeUndefined();
  });
});
