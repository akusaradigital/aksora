import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  renderEmailTemplate: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/email", () => ({
  renderEmailTemplate: mocks.renderEmailTemplate,
  sendEmail: mocks.sendEmail,
}));

import { POST } from "../route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/email-preview/send", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.renderEmailTemplate.mockReturnValue({ subject: "Test", html: "<p>Test</p>" });
  mocks.sendEmail.mockResolvedValue({ ok: true, id: "email-1" });
});

describe("POST /api/admin/email-preview/send", () => {
  it("rejects an unauthenticated caller", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ to: "a@b.com" }) as never);
    expect(res.status).toBe(403);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects a non-superadmin workspace member (e.g. a regular 'qa' or workspace 'admin')", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
    const res = await POST(makeRequest({ to: "a@b.com" }) as never);
    expect(res.status).toBe(403);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("allows a true platform superadmin", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "superadmin", company: "" });
    const res = await POST(makeRequest({ to: "a@b.com", type: "welcome" }) as never);
    expect(res.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalled();
  });
});
