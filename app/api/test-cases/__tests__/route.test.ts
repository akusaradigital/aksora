import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  db: {
    run: vi.fn(),
    get: vi.fn(),
  },
  getTestSuite: vi.fn(),
  makePublicToken: vi.fn(() => "public-token"),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth-core", () => ({
  isAdminUser: mocks.isAdminUser,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/data", () => ({
  getTestSuite: mocks.getTestSuite,
  makePublicToken: mocks.makePublicToken,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { DELETE, POST, PUT } from "@/app/api/test-cases/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAdminUser.mockReturnValue(false);
});

function buildFormRequest(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return new Request("http://localhost/api/test-cases", {
    method: "POST",
    body: formData,
  }) as NextRequest;
}

describe("test-cases route", () => {
  it("returns 401 when user is missing", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(buildFormRequest({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("creates a test case and revalidates dependent pages", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "pm", company: "acme" });
    mocks.db.get.mockResolvedValueOnce({ company: "acme" });
    mocks.getTestSuite.mockResolvedValueOnce({ publicToken: "suite-token" });

    const response = await POST(
      buildFormRequest({
        testSuiteId: "7",
        tcId: "TC-1",
        typeCase: "Positive",
        preCondition: "Ready",
        caseName: "Login works",
        testStep: "Open login",
        expectedResult: "See dashboard",
        actualResult: "See dashboard",
        status: "Pass",
        evidence: "https://example.com/evidence",
        priority: "High",
      }),
    );

    expect(mocks.db.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "TestCase"'),
      expect.arrayContaining(["acme", "public-token", "7", "TC-1", "Positive"]),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/test-cases");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/test-execution/suite-token");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Test case added successfully." });
  });

  it("rejects invalid delete ids", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "" });
    mocks.isAdminUser.mockReturnValue(true);

    const response = await DELETE(
      {
        nextUrl: new URL("http://localhost/api/test-cases"),
      } as NextRequest,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid ID." });
  });

  it("updates execution rows", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "fullstack", company: "acme" });
    mocks.isAdminUser.mockReturnValue(false);

    const response = await PUT(
      new Request("http://localhost/api/test-cases", {
        method: "PUT",
        body: JSON.stringify({
          rows: [
            { id: 9, status: "Fail", actualResult: "Broken", evidence: "", priority: "Low" },
            { id: null },
          ],
        }),
      }) as NextRequest,
    );

    expect(mocks.db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "TestCase"'),
      ["Fail", "Broken", "", "Low", 9, "acme"],
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/test-cases");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Execution saved successfully." });
  });
});

