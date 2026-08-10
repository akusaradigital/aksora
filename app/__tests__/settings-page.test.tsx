import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  pageShell: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  getCurrentUser: vi.fn(async () => ({ id: 1, role: "superadmin", company: "acme", email: "a@b.com" })),
  isManagementAdmin: vi.fn(() => true),
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect");
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/roles", () => ({
  isManagementAdmin: mocks.isManagementAdmin,
}));

vi.mock("@phosphor-icons/react/dist/ssr", () => {
  function IconStub({ name, ...props }: { name: string } & Record<string, unknown>) {
    return <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />;
  }
  return Object.fromEntries(
    ["Users", "Gear", "CaretRight", "Info", "Lock", "Bell"].map((name) => [
      name,
      (props: Record<string, unknown>) => <IconStub name={name} {...props} />,
    ]),
  );
});

import SettingsPage from "@/app/settings/page";

describe("settings page", () => {
  it("renders the main settings groups and links", async () => {
    const html = renderToStaticMarkup(await SettingsPage());

    expect(html).toContain("Personal");
    expect(html).toContain("User Management");
    expect(html).toContain("My Profile");
    expect(html).toContain('href="/settings/profile"');
    expect(html).toContain('href="/settings/users"');
    const props = (mocks.pageShell as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0]![0];
    expect(props).toEqual(expect.objectContaining({
      title: "Settings",
      description: "Manage profile, users, assignees, and workspace configuration.",
    }));
  });
});

