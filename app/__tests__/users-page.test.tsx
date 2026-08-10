import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  moduleWorkspace: vi.fn(() => <div data-testid="module-workspace" />),
  getCurrentUser: vi.fn(),
  getModuleRows: vi.fn(),
  isAdminUser: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("@/components/module/module-workspace", () => ({
  ModuleWorkspace: mocks.moduleWorkspace,
}));

vi.mock("@/lib/data", () => ({
  getModuleRows: mocks.getModuleRows,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth-core", () => ({
  isAdminUser: mocks.isAdminUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import UserManagementPage from "@/app/settings/users/page";

describe("users page", () => {
  it("renders module workspace for admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      role: "admin",
      company: "",
      email: "admin@example.com",
    });
    mocks.isAdminUser.mockReturnValueOnce(true);
    mocks.getModuleRows.mockResolvedValueOnce([{ id: 1, name: "Alice" }]);

    const element = await UserManagementPage();
    renderToStaticMarkup(element);

    expect(mocks.getModuleRows).toHaveBeenCalledWith("users");
    expect(mocks.moduleWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "users",
        rows: [{ id: 1, name: "Alice" }],
      }),
      undefined,
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects non-admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 2,
      role: "qa",
      company: "acme",
      email: "qa@example.com",
    });
    mocks.isAdminUser.mockReturnValueOnce(false);

    await expect(UserManagementPage()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});


