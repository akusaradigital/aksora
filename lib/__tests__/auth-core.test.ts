import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    get: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import {
  authEnabled,
  createSessionToken,
  getInviteRoleOptions,
  getRoleLabel,
  getPublicRoleOptions,
  hashPassword,
  isAdminUser,
  normalizeRole,
  registerUser,
  sessionCookieName,
  validateCredentials,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth-core";
import { getCompanyLabel } from "@/lib/roles";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("AUTH_SECRET", "");
  vi.clearAllMocks();
  mocks.db.get.mockResolvedValue(undefined);
  mocks.db.run.mockResolvedValue(undefined);
});

describe("auth-core", () => {
  it("normalizes roles and admin detection", () => {
    expect(normalizeRole("Admin (Owner)")).toBe("admin");
    expect(normalizeRole(" PM ")).toBe("pm");
    expect(normalizeRole("AI Engineer")).toBe("ai engineer");
    expect(getRoleLabel("ai")).toBe("AI Engineer");
    expect(getInviteRoleOptions().map((option) => option.value)).toEqual(["fe", "be", "fullstack", "ai", "qa", "pm", "guest"]);
    expect(getPublicRoleOptions().map((option: { label: string }) => option.label)).toEqual([
      "Product Manager",
      "Project Manager",
      "System Analyst",
      "UI/UX Designer",
      "Front-end Engineer",
      "Back-end Engineer",
      "Fullstack Engineer",
      "AI Engineer",
      "Mobile Developer",
      "QA Engineer",
      "QA Automation Engineer",
      "DevOps Engineer",
      "Security Engineer",
      "Database Administrator",
      "Software Architect",
    ]);
    expect(getCompanyLabel("Magnus", "admin")).toBe("Magnus");
    expect(isAdminUser("superadmin", "")).toBe(true);
    expect(isAdminUser("superadmin", "acme")).toBe(false);
  });

  it("detects auth config availability", () => {
    expect(authEnabled()).toBe(false);
    vi.stubEnv("AUTH_SECRET", " topsecret ");
    expect(authEnabled()).toBe(true);
  });

  it("hashes passwords with scrypt and verifies them", async () => {
    const firstHash = await hashPassword("secret");
    const secondHash = await hashPassword("secret");

    expect(firstHash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    expect(secondHash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword("secret", firstHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", firstHash)).resolves.toBe(false);
  });

  it("accepts legacy password hashes for compatibility", async () => {
    const legacyHash = "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";

    await expect(verifyPassword("secret", legacyHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", legacyHash)).resolves.toBe(false);
  });

  it("creates and verifies session tokens", async () => {
    vi.stubEnv("AUTH_SECRET", "topsecret");

    const token = await createSessionToken("user@example.com");

    expect(await verifySessionToken(token)).toBe(true);
    expect(mocks.db.get).not.toHaveBeenCalled();

    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 60 * 1000 + 1);
    expect(await verifySessionToken(token)).toBe(false);
    vi.restoreAllMocks();
  });

  it("validates credentials and upgrades legacy password hashes", async () => {
    const legacyHash = "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
    const mockUser = {
      id: 1,
      name: "User",
      email: "user@example.com",
      role: "fullstack",
      company: "acme",
      password: legacyHash,
      activeWorkspaceId: 1,
    };

    mocks.db.get.mockResolvedValueOnce(mockUser);

    const result = await validateCredentials("user@example.com", "secret");

    expect(result).toMatchObject({ id: 1, email: "user@example.com" });
    expect(mocks.db.get).toHaveBeenCalledWith(
      expect.stringContaining('FROM "User" u'),
      ["user@example.com"],
    );
    expect(mocks.db.run).toHaveBeenCalledWith(
      'UPDATE "User" SET "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [expect.stringMatching(/^scrypt\$/), 1],
    );

    mocks.db.get.mockResolvedValueOnce(undefined);
    expect(await validateCredentials("bad@example.com", "wrong")).toBeNull();
  });

  it("registers users and maps unique errors", async () => {
    await expect(registerUser("user@example.com", "secret", "User", "fullstack", "acme")).resolves.toEqual({ success: true });
    expect(mocks.db.run).toHaveBeenCalledWith(
      'INSERT INTO "User" ("email", "password", "name", "role", "company") VALUES (?, ?, ?, ?, ?)',
      ["user@example.com", expect.stringMatching(/^scrypt\$/), "User", "fullstack", "acme"],
    );

    mocks.db.run.mockRejectedValueOnce({ message: "UNIQUE constraint failed", code: "SQLITE_CONSTRAINT" });
    await expect(registerUser("user@example.com", "secret")).resolves.toEqual({ error: "Email address is already registered. Please use a different email." });
  });

  it("exposes the cookie name", () => {
    expect(sessionCookieName()).toBe("aksora_session");
  });
});
