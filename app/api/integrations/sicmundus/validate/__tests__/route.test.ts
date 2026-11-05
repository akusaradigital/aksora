import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loginSicmundus: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/sicmundus", () => ({
  loginSicmundus: mocks.loginSicmundus,
}));

import { POST } from "@/app/api/integrations/sicmundus/validate/route";

describe("POST /api/integrations/sicmundus/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/integrations/sicmundus/validate", {
      method: "POST",
      body: JSON.stringify({ username: "user", password: "password" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when username or password is missing", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Test User" });

    const req = new Request("http://localhost/api/integrations/sicmundus/validate", {
      method: "POST",
      body: JSON.stringify({ username: "", password: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 401 when Sicmundus authentication fails", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Test User" });
    mocks.loginSicmundus.mockRejectedValueOnce(new Error("Invalid credentials"));

    const req = new Request("http://localhost/api/integrations/sicmundus/validate", {
      method: "POST",
      body: JSON.stringify({ username: "wrong_user", password: "wrong_password" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid credentials");
  });

  it("returns 200 with user profile on successful authentication without DB write", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Test User" });
    mocks.loginSicmundus.mockResolvedValueOnce({
      token: "sic-jwt-12345",
      user: {
        id: "sic-usr-99",
        username: "alex.wright",
        full_name: "Alexander Wright",
        email: "alex@company.com",
      },
    });

    const req = new Request("http://localhost/api/integrations/sicmundus/validate", {
      method: "POST",
      body: JSON.stringify({ username: "alex.wright", password: "correct-password" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user.id).toBe("sic-usr-99");
    expect(json.user.name).toBe("Alexander Wright");
    expect(json.user.email).toBe("alex@company.com");
  });
});
