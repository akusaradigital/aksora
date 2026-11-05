import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSessionOrApiUser: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  logActivity: vi.fn(),
  broadcastCriticalBug: vi.fn(),
}));

vi.mock("@/lib/ai-runner", () => ({
  getSessionOrApiUser: mocks.getSessionOrApiUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    run: mocks.dbRun,
  },
}));

vi.mock("@/lib/data-helpers", () => ({
  logActivity: mocks.logActivity,
  makePublicToken: () => "mock-token-xyz",
}));

vi.mock("@/lib/chat-broadcast", () => ({
  broadcastCriticalBug: mocks.broadcastCriticalBug,
}));

import { POST } from "@/app/api/extension/bug/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionOrApiUser.mockResolvedValue({
    id: 10,
    name: "Tester",
    email: "tester@example.com",
    company: "Acme",
    activeWorkspaceId: 2,
  });
  mocks.dbGet.mockResolvedValue({ id: 101 });
});

describe("extension bug reporting route", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getSessionOrApiUser.mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost/api/extension/bug", {
      method: "POST",
      body: JSON.stringify({ title: "Crash" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const req = new NextRequest("http://localhost/api/extension/bug", {
      method: "POST",
      body: JSON.stringify({ title: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("successfully creates a bug and triggers broadcast if critical", async () => {
    const req = new NextRequest("http://localhost/api/extension/bug", {
      method: "POST",
      body: JSON.stringify({
        title: "Checkout payment fails",
        project: "E-Commerce",
        severity: "critical",
        priority: "P1",
        url: "https://shop.example.com/checkout",
        consoleErrors: "TypeError: cannot read properties of undefined",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe(101);
    expect(body.data.title).toBe("Checkout payment fails");
    expect(body.data.severity).toBe("critical");
    expect(body.data.viewUrl).toContain("mock-token-xyz");

    expect(mocks.dbGet).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "Bug"'),
      expect.arrayContaining(["Checkout payment fails", "E-Commerce", "critical", "P1"]),
    );

    expect(mocks.broadcastCriticalBug).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Checkout payment fails",
        severity: "critical",
      }),
    );
  });
});
