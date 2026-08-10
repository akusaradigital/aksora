import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    run: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import {
  buildSearchIndexPrefilter,
  buildSearchTokenClause,
  deleteSearchTokens,
  shouldIndexModule,
  syncSearchTokens,
  syncSearchTokensBulk,
} from "@/lib/search-index";

beforeEach(() => {
  mocks.db.run.mockReset();
});

describe("search-index", () => {
  it("detects indexed modules", () => {
    expect(shouldIndexModule("test-cases")).toBe(true);
    expect(shouldIndexModule("nonexistent")).toBe(false);
  });

  it("syncs tokens for indexed modules", async () => {
    await syncSearchTokens("test-cases", "acme", 42, {
      caseName: "Alpha beta",
      status: "Open",
      notes: "Alpha, beta and beta",
    });

    expect(mocks.db.run).toHaveBeenCalledTimes(2);
    expect(mocks.db.run).toHaveBeenNthCalledWith(
      1,
      'DELETE FROM "SearchToken" WHERE "company" = ? AND "entityType" = ? AND ("entityIdInt" = ? OR "entityId" = ?)',
      ["acme", "test-cases", 42, "42"],
    );
    expect(mocks.db.run).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO "SearchToken" ("company", "entityType", "entityId", "entityIdInt", "token") VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
      ["acme", "test-cases", "42", 42, "alpha", "acme", "test-cases", "42", 42, "beta", "acme", "test-cases", "42", 42, "open"],
    );
  });

  it("skips unsupported modules", async () => {
    await syncSearchTokens("unknown", "acme", 42, { title: "Ignored" });
    await deleteSearchTokens("unknown", "acme", 42);

    expect(mocks.db.run).not.toHaveBeenCalled();
  });

  it("builds prefilter and token clause SQL with capped tokens", () => {
    const prefilter = buildSearchIndexPrefilter("test-cases", "acme", "Alpha beta gamma delta", "tc");
    const clause = buildSearchTokenClause("test-cases", "acme", "Alpha beta gamma delta", "tc");

    expect(prefilter.clause).toContain('tc."id"');
    expect(prefilter.clause.split("EXISTS").length - 1).toBe(3);
    expect(prefilter.params).toEqual([
      "acme",
      "test-cases",
      "alpha",
      "alpha",
      "acme",
      "test-cases",
      "beta",
      "beta",
      "acme",
      "test-cases",
      "gamma",
      "gamma",
    ]);
    expect(clause).toEqual(prefilter);
  });

  it("returns empty clauses when company or query is unusable", () => {
    expect(buildSearchIndexPrefilter("test-cases", "", "alpha")).toEqual({ clause: "", params: [] });
    expect(buildSearchTokenClause("test-cases", "acme", "a")).toEqual({ clause: "", params: [] });
  });

  it("processes bulk sync in batches", async () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({
      module: "test-cases",
      company: "acme",
      entityId: index + 1,
      data: { caseName: `Case ${index + 1}` },
    }));

    await syncSearchTokensBulk(rows);

    expect(mocks.db.run).toHaveBeenCalledTimes(22);
  });
});
