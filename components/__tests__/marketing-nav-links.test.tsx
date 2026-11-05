import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { MarketingNavLinks } from "@/components/landing/marketing-nav-links";

describe("MarketingNavLinks active page indicator and routing", () => {
  it("highlights Home as active blue when on '/'", () => {
    mockPathname = "/";
    const html = renderToStaticMarkup(<MarketingNavLinks />);

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/features"');
    expect(html).toContain('href="/#platform"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/docs/api"');

    // Home link has active blue class
    expect(html).toContain("text-blue-600");
  });

  it("highlights Features as active blue when on '/features'", () => {
    mockPathname = "/features";
    const html = renderToStaticMarkup(<MarketingNavLinks />);
    expect(html).toContain("Features");
    expect(html).toContain("text-blue-600");
  });

  it("highlights Pricing as active blue when on '/pricing'", () => {
    mockPathname = "/pricing";
    const html = renderToStaticMarkup(<MarketingNavLinks />);
    expect(html).toContain("Pricing");
    expect(html).toContain("text-blue-600");
  });

  it("highlights API Docs as active blue when on '/docs/api'", () => {
    mockPathname = "/docs/api";
    const html = renderToStaticMarkup(<MarketingNavLinks />);
    expect(html).toContain("API Docs");
    expect(html).toContain("text-blue-600");
  });

  it("renders mobile drawer links when isMobile is true", () => {
    mockPathname = "/";
    const html = renderToStaticMarkup(<MarketingNavLinks isMobile />);
    expect(html).toContain("Home");
    expect(html).toContain("Features");
    expect(html).toContain("Platform");
    expect(html).toContain("Pricing");
    expect(html).toContain("API Docs");
  });
});
