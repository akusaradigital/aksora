import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateApiRequest: vi.fn(),
  isRateLimited: vi.fn(),
  recordFailedAttempt: vi.fn(),
  getModuleSheetRows: vi.fn(),
  createModuleRecord: vi.fn(),
  updateModuleRecord: vi.fn(),
  deleteModuleRecords: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  authenticateApiRequest: mocks.authenticateApiRequest,
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mocks.isRateLimited,
  recordFailedAttempt: mocks.recordFailedAttempt,
}));

vi.mock("@/lib/data", () => ({
  getModuleSheetRows: mocks.getModuleSheetRows,
  createModuleRecord: mocks.createModuleRecord,
  updateModuleRecord: mocks.updateModuleRecord,
  deleteModuleRecords: mocks.deleteModuleRecords,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { DELETE, GET, PATCH, POST } from "../route";

function makeRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { authorization: "Bearer aksora_test", "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const params = Promise.resolve({ module: "bugs" });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.isRateLimited.mockResolvedValue({ limited: false });
  mocks.recordFailedAttempt.mockResolvedValue(undefined);
  mocks.getModuleSheetRows.mockResolvedValue([]);
  mocks.createModuleRecord.mockResolvedValue(undefined);
  mocks.updateModuleRecord.mockResolvedValue(undefined);
  mocks.deleteModuleRecords.mockResolvedValue(undefined);
});

describe("public v1 module route — scope enforcement", () => {
  it("allows a read-only key to GET", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({
      id: 1, name: "A", email: "a@x.com", role: "qa", company: "acme", allowedModules: ["*"], scope: "read",
    });

    const res = await GET(makeRequest("GET", "http://localhost/api/public/v1/bugs"), { params });
    expect(res.status).toBe(200);
  });

  it("rejects a read-only key on POST with 403", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({
      id: 1, name: "A", email: "a@x.com", role: "qa", company: "acme", allowedModules: ["*"], scope: "read",
    });

    const res = await POST(makeRequest("POST", "http://localhost/api/public/v1/bugs", { title: "x" }), { params });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/read-only/i);
    expect(mocks.createModuleRecord).not.toHaveBeenCalled();
  });

  it("rejects a read-only key on PATCH with 403", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({
      id: 1, name: "A", email: "a@x.com", role: "qa", company: "acme", allowedModules: ["*"], scope: "read",
    });

    const res = await PATCH(makeRequest("PATCH", "http://localhost/api/public/v1/bugs", { id: 1, title: "x" }), { params });
    expect(res.status).toBe(403);
    expect(mocks.updateModuleRecord).not.toHaveBeenCalled();
  });

  it("rejects a read-only key on DELETE with 403", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({
      id: 1, name: "A", email: "a@x.com", role: "qa", company: "acme", allowedModules: ["*"], scope: "read",
    });

    const res = await DELETE(makeRequest("DELETE", "http://localhost/api/public/v1/bugs?id=1"), { params });
    expect(res.status).toBe(403);
    expect(mocks.deleteModuleRecords).not.toHaveBeenCalled();
  });

  it("allows a write-scoped key on POST", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({
      id: 1, name: "A", email: "a@x.com", role: "qa", company: "acme", allowedModules: ["*"], scope: "write",
    });

    const res = await POST(
      makeRequest("POST", "http://localhost/api/public/v1/bugs", {
        project: "P", module: "M", bugType: "Functional", title: "T", preconditions: "pre",
        stepsToReproduce: "steps", expectedResult: "exp", actualResult: "act",
        severity: "high", priority: "P1", status: "open",
      }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(mocks.createModuleRecord).toHaveBeenCalledTimes(1);
  });
});
