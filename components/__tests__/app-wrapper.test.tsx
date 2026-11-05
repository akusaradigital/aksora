import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-assignment-notifications", () => ({
  useAssignmentNotifications: vi.fn(),
}));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <div data-testid="app-sidebar">Mock Sidebar</div>,
  NotificationPanel: () => null,
}));

vi.mock("@/components/shared/search/global-search", () => ({
  GlobalSearch: () => <div data-testid="global-search">Search</div>,
}));

vi.mock("@/components/shared/search/command-palette", () => ({
  CommandPalette: () => null,
}));

vi.mock("@/components/layout/onboarding-tour", () => ({
  OnboardingTour: () => null,
}));

vi.mock("@/components/layout/install-prompt-banner", () => ({
  InstallPromptBanner: () => null,
}));

import { AppWrapper } from "@/components/layout/app-wrapper";

describe("AppWrapper standalone vs app shell layout guard", () => {
  it("renders /docs/api as standalone tutorial page with NO app sidebar and NO app header", () => {
    mockPathname = "/docs/api";

    const html = renderToStaticMarkup(
      <AppWrapper>
        <div data-testid="docs-content">REST API &amp; Webhooks Reference</div>
      </AppWrapper>,
    );

    expect(html).toContain("REST API &amp; Webhooks Reference");
    expect(html).not.toContain("Mock Sidebar");
    expect(html).not.toContain("data-testid=\"global-search\"");
  });

  it("renders standalone marketing pages (/features, /pricing, /about) with NO app sidebar", () => {
    mockPathname = "/features";
    const featuresHtml = renderToStaticMarkup(
      <AppWrapper>
        <div>Features Content</div>
      </AppWrapper>,
    );
    expect(featuresHtml).toContain("Features Content");
    expect(featuresHtml).not.toContain("Mock Sidebar");

    mockPathname = "/pricing";
    const pricingHtml = renderToStaticMarkup(
      <AppWrapper>
        <div>Pricing Content</div>
      </AppWrapper>,
    );
    expect(pricingHtml).toContain("Pricing Content");
    expect(pricingHtml).not.toContain("Mock Sidebar");
  });

  it("renders public report and reset-password pages with NO app sidebar", () => {
    mockPathname = "/report/tok_abc123";
    const reportHtml = renderToStaticMarkup(
      <AppWrapper>
        <div>Public Report View</div>
      </AppWrapper>,
    );
    expect(reportHtml).toContain("Public Report View");
    expect(reportHtml).not.toContain("Mock Sidebar");

    mockPathname = "/reset-password";
    const resetHtml = renderToStaticMarkup(
      <AppWrapper>
        <div>Reset Password Form</div>
      </AppWrapper>,
    );
    expect(resetHtml).toContain("Reset Password Form");
    expect(resetHtml).not.toContain("Mock Sidebar");
  });

  it("does not render standalone content for internal workspace routes", () => {
    mockPathname = "/dashboard";
    const html = renderToStaticMarkup(
      <AppWrapper>
        <div>Dashboard Content</div>
      </AppWrapper>,
    );
    // Because /dashboard is not standalone, AppWrapper returns AppSplashScreen on SSR while authLoading is true
    // (children are withheld until auth is verified and workspace shell renders)
    expect(html).not.toContain("Dashboard Content");
  });
});
