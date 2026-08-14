import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  searchParams: vi.fn(),
  confirmModal: vi.fn(() => null),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: mocks.searchParams }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: mocks.toast,
}));

vi.mock("@/components/ui/confirm-modal", () => ({
  ConfirmModal: mocks.confirmModal,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
}));

import LoginPage from "@/app/login/page";

describe("login page", () => {
  it("renders the sign-in form and honors next query param", () => {
    mocks.searchParams.mockReturnValue("/dashboard");

    const html = renderToStaticMarkup(<LoginPage />);

    expect(html).toContain("Welcome back");
    expect(html).toContain("Use Google or email to enter your workspace.");
    expect(html).toContain("Sign In");
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });
});
