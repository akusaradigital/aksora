import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createSessionToken: vi.fn(),
  sessionCookieName: vi.fn(() => "aksora_token"),
  getWorkspaceMembershipsForUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  createSessionToken: mocks.createSessionToken,
  sessionCookieName: mocks.sessionCookieName,
}));

vi.mock("@/lib/workspace-memberships", () => ({
  getWorkspaceMembershipsForUser: mocks.getWorkspaceMembershipsForUser,
}));

import { GET } from "../route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.sessionCookieName.mockReturnValue("aksora_token");
  mocks.getCurrentUser.mockResolvedValue({ id: 1, email: "a@b.com", name: "A", activeWorkspaceId: 1 });
  mocks.getWorkspaceMembershipsForUser.mockResolvedValue([{ workspaceId: 5, name: "Acme", role: "admin" }]);
  mocks.createSessionToken.mockResolvedValue("new-token");
});

describe("GET /api/auth/workspace/redirect", () => {
  it("redirects to the default dashboard when no 'to' param is given", async () => {
    const req = new NextRequest("http://localhost/api/auth/workspace/redirect");
    const res = await GET(req as never);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("redirects to a safe relative 'to' path", async () => {
    const req = new NextRequest("http://localhost/api/auth/workspace/redirect?to=/tasks");
    const res = await GET(req as never);
    expect(res.headers.get("location")).toBe("http://localhost/tasks");
  });

  it("falls back to /dashboard when 'to' is an absolute external URL (open redirect attempt)", async () => {
    const req = new NextRequest("http://localhost/api/auth/workspace/redirect?to=https://evil.example.com");
    const res = await GET(req as never);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("falls back to /dashboard when 'to' is a protocol-relative URL (//evil.example.com)", async () => {
    const req = new NextRequest("http://localhost/api/auth/workspace/redirect?to=//evil.example.com");
    const res = await GET(req as never);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("falls back to /dashboard when 'to' uses a backslash to spoof a relative path", async () => {
    const req = new NextRequest("http://localhost/api/auth/workspace/redirect?to=/%5Cevil.example.com");
    const res = await GET(req as never);
    expect(res.headers.get("location")).not.toContain("evil.example.com");
  });

  it("preserves a safe 'to' path when switching workspace", async () => {
    const req = new NextRequest("http://localhost/api/auth/workspace/redirect?workspaceName=Acme&to=/bugs");
    const res = await GET(req as never);
    expect(res.headers.get("location")).toBe("http://localhost/bugs");
    expect(mocks.createSessionToken).toHaveBeenCalled();
  });
});
