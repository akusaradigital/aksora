import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  pageShell: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  profileForm: vi.fn(() => <div data-testid="profile-form" />),
  getCurrentUser: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/app/settings/profile/profile-form", () => ({
  ProfileForm: mocks.profileForm,
}));

import ProfilePage from "@/app/settings/profile/page";

describe("profile page", () => {
  it("renders the profile form for the current user", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Rina",
      email: "rina@example.com",
      role: "pm",
    });

    const element = await ProfilePage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Account Details");
    expect(html).toContain("Security &amp; Access");
    expect(html).toContain("rina@example.com");
    expect(mocks.profileForm).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ name: "Rina", role: "pm" }),
      }),
      undefined,
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects anonymous users to login", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    await expect(ProfilePage()).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});


