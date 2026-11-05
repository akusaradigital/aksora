import type { Metadata } from "next";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { HeroSearchBar } from "@/components/landing/hero-search-bar";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { EcosystemLogos } from "@/components/landing/ecosystem-logos";
import { FeatureShowcase2Col } from "@/components/landing/feature-showcase-2col";
import { ProgramManagerBanner } from "@/components/landing/program-manager-banner";
import { CallToActionBanner } from "@/components/landing/call-to-action-banner";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { getLocale, getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Aksora — One Team. One Flow. All-in-One QA & Engineering Workspace",
  description:
    "Manage test planning, execution runs, defect triage, sprint workflows, and standup automation in one high-velocity platform.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const dict = getDictionary(await getLocale());
  const t = dict.landing;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-white transition-colors antialiased">
      {/* 1. TOP NAVBAR */}
      <MarketingHeader />

      <main>
        {/* 2. HERO SECTION (RICH ROYAL BLUE BACKGROUND) */}
        <section className="relative overflow-visible bg-gradient-to-b from-[#1e3a8a] via-[#1d4ed8] to-[#1e40af] pt-32 pb-44 sm:pt-40 sm:pb-56 text-center text-white px-5 sm:px-8 border-b border-blue-900/60 shadow-inner">
          {/* Subtle background ambient mesh */}
          <div
            className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[140px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[140px]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-5xl">
            {/* Main Headline */}
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl sm:leading-[1.12]">
              Manage Your Engineering &amp; QA Workflow With Aksora
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-lg">
              Stay connected with your development team and office without friction. Aksora unifies test management, live execution runs, bug tracking, and automated standups in one real-time platform.
            </p>

            {/* Centered Search / Email Pill Input */}
            <HeroSearchBar />
          </div>

          {/* Centered Large UI Mockup Overlapping Hero and White Section Below */}
          <div className="mt-14 sm:mt-20 -mb-56 sm:-mb-72 relative z-30 px-2 sm:px-4">
            <HeroMockup />
          </div>
        </section>

        {/* 3. PURE WHITE CANVAS SECTIONS */}
        <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white relative z-20 transition-colors">
          {/* Tech Stack & Ecosystem Logos */}
          <EcosystemLogos />

          {/* Two-Column Feature Showcase (Floating Cards on left, Accordion on right) */}
          <FeatureShowcase2Col />

          {/* Highlight Feature Banner (Program Manager & Squad Velocity) */}
          <ProgramManagerBanner />

          {/* Call to Action Banner (Rich Blue Card) */}
          <CallToActionBanner />
        </div>
      </main>

      {/* 4. FOOTER (5-COLUMN WHITE FOOTER) */}
      <MarketingFooter />

      {/* 5. SCROLL TO TOP */}
      <ScrollToTop />
    </div>
  );
}
