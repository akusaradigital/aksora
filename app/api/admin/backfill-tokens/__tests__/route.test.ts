import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  db: { query: vi.fn(), run: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { POST } from "../route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.query.mockResolvedValue([]);
  mocks.db.run.mockResolvedValue(undefined);
});

describe("POST /api/admin/backfill-tokens", () => {
  it("rejects an unauthenticated caller", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("rejects a workspace-scoped user whose role string happens to be 'superadmin' but who still belongs to a company", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "superadmin", company: "acme" });
    const res = await POST();
    expect(res.status).toBe(403);
    expect(mocks.db.query).not.toHaveBeenCalled();
  });

  it("rejects a non-admin role", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("allows a true platform superadmin (role=superadmin, no company) and assigns a distinct random token per row", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "superadmin", company: "" });
    mocks.db.query.mockResolvedValueOnce([{ id: 101 }, { id: 102 }]); // Task rows needing a token
    mocks.db.query.mockResolvedValue([]); // every other table: nothing to backfill

    const res = await POST();
    expect(res.status).toBe(200);

    const updateCalls = mocks.db.run.mock.calls.filter(([sql]) => String(sql).includes('UPDATE "Task"'));
    expect(updateCalls).toHaveLength(2);
    const [token1] = updateCalls[0][1];
    const [token2] = updateCalls[1][1];
    expect(token1).not.toBe(token2);
    expect(String(token1)).not.toContain("101"); // not derived from the row id
  });
});
