import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bug,
  Checks,
  ShieldCheck,
  Lightning,
  Kanban,
  Play,
  CheckCircle,
  Clock,
  Sparkle,
  Stack,
  CaretRight,
  Quotes,
  Star,
} from "@phosphor-icons/react/dist/ssr";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { PricingSection } from "@/components/landing/pricing-toggle";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { HeroHeadline } from "./hero-headline";
import { getLocale, getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Aksora — One Team. One Flow. All-in-One QA & Engineering Workspace",
  description:
    "Plan tests, execute runs, triage defects, manage sprints, and automate daily standups in one unified workspace.",
  alternates: { canonical: "/" },
};

const featureIcons = [Checks, Play, Bug, Kanban, Lightning, ShieldCheck];

export default async function LandingPage() {
  const t = getDictionary(await getLocale()).landing;
  const featureCards = t.featureCards.map((card, i) => ({ ...card, icon: featureIcons[i] }));
  const keyMetrics = t.metrics;
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-slate-950 antialiased">
      <MarketingHeader />

      <main className="pt-14">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white pb-20 pt-16 lg:pb-32 lg:pt-24">
          {/* Ambient Glows */}
          <div
            className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-[120px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-[120px]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700 backdrop-blur-md">
                <Sparkle size={14} weight="bold" />
                <span>{t.badge}</span>
              </div>

              {/* Title */}
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl sm:leading-[1.15]">
                <HeroHeadline
                  variantA={
                    <>
                      {t.heroVariantALine1} <br />
                      <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">
                        {t.heroVariantALine2}
                      </span>
                    </>
                  }
                  variantB={
                    <>
                      {t.heroVariantBLine1} <br />
                      <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">
                        {t.heroVariantBLine2}
                      </span>
                    </>
                  }
                />
              </h1>

              {/* Subtitle */}
              <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
                {t.subtitle}
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/35"
                >
                  <span>{t.ctaStart}</span>
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                >
                  <Play size={16} weight="bold" className="text-blue-600" />
                  <span>{t.ctaDemo}</span>
                </Link>
              </div>

              {/* Subtext */}
              <p className="mt-4 text-xs text-slate-500">
                {t.subtext}
              </p>
            </div>

            {/* PRODUCT MOCKUP PREVIEW — ponytail: decorative fake-dashboard copy, not localized. Add when the real dashboard UI it mimics is localized (Stage 2). */}
            <div className="relative mt-14 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/60 backdrop-blur-xl sm:p-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* Mockup Window Topbar */}
                <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-white px-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    <span className="ml-3 hidden font-mono text-[11px] text-slate-500 sm:inline">
                      aksora.app / workspace / sprint-24-execution
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
                      <CheckCircle size={12} weight="bold" /> 94.8% Pass Rate
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">
                      <Clock size={12} weight="bold" /> Sprint Active
                    </span>
                  </div>
                </div>

                {/* Mockup Dashboard Content Grid */}
                <div className="grid gap-4 p-4 sm:grid-cols-12 sm:p-6">
                  {/* Left: Test Suites & Plans */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4 sm:col-span-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Stack size={14} weight="bold" className="text-blue-600" />
                      Test Suites
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between rounded border border-blue-200 bg-blue-50 p-2.5 text-blue-700">
                        <span className="font-semibold">Authentication &amp; MFA</span>
                        <span className="font-mono text-[11px]">18/18 Pass</span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                        <span>Payment &amp; Checkout Flow</span>
                        <span className="font-mono text-[11px] text-emerald-600">14/15 Pass</span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                        <span>Workspace Switcher RBAC</span>
                        <span className="font-mono text-[11px] text-emerald-600">9/9 Pass</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Live Execution Run Items */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4 sm:col-span-8">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Play size={14} weight="bold" className="text-emerald-600" />
                        Live Execution Run #24
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-emerald-700">
                        In-Progress
                      </span>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="pb-2 font-medium">Test Case</th>
                            <th className="pb-2 font-medium">Priority</th>
                            <th className="pb-2 font-medium">Verdict</th>
                            <th className="pb-2 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="py-2.5 font-medium text-slate-800">
                              Verify Google OAuth with custom workspace domain
                            </td>
                            <td className="py-2.5 text-slate-500">High</td>
                            <td className="py-2.5">
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                Passed
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-500">0.4s</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-medium text-slate-800">
                              Prevent negative quantity on checkout recalculate
                            </td>
                            <td className="py-2.5 text-rose-600">Critical</td>
                            <td className="py-2.5">
                              <span className="rounded bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                                Failed
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span className="cursor-pointer rounded border border-rose-200 bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                + Log Bug
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-medium text-slate-800">
                              Export weekly sprint summary as formatted PDF
                            </td>
                            <td className="py-2.5 text-slate-500">Medium</td>
                            <td className="py-2.5">
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                Passed
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-500">1.2s</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS STRIP */}
        <section className="border-b border-slate-200 bg-slate-50 py-10">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
              {t.trustedBy}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {t.teams.map((team) => (
                <span key={team} className="text-sm font-semibold text-slate-500 grayscale">
                  {team}
                </span>
              ))}
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              {keyMetrics.map((item) => (
                <div key={item.label} className="p-2">
                  <p className="text-3xl font-extrabold tracking-tight text-blue-600 sm:text-4xl">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="scroll-mt-16 border-b border-slate-200 bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {t.featuresLabel}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {t.featuresHeading}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {t.featuresSubtitle}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className="scroll-reveal group relative rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-lg bg-blue-50 p-2.5 text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                      <card.icon size={22} weight="bold" aria-hidden="true" />
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-slate-950 group-hover:text-blue-700">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF & TESTIMONIALS */}
        <section id="testimonials" className="scroll-mt-16 border-b border-slate-200 bg-slate-50 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {t.testimonialsLabel}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {t.testimonialsHeading}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {t.testimonialsSubtitle}
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {t.testimonials.map((item, idx) => (
                <div
                  key={idx}
                  className="scroll-reveal relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-200/50"
                >
                  <div>
                    <div className="flex items-center gap-1 text-amber-400 mb-4">
                      {[...Array(5)].map((_, starIdx) => (
                        <Star key={starIdx} size={16} weight="fill" />
                      ))}
                    </div>
                    <Quotes size={28} weight="fill" className="text-blue-100 mb-3" />
                    <p className="text-sm leading-relaxed text-slate-700 italic">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                      {item.author.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.author}</h4>
                      <p className="text-[11px] text-slate-500">{item.role} · <strong className="font-semibold text-blue-600">{item.company}</strong></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="scroll-mt-16 border-b border-slate-200 bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {t.pricingLabel}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {t.pricingHeading}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {t.pricingSubtitle}
              </p>
            </div>

            <div className="scroll-reveal mt-12">
              <PricingSection />
            </div>
          </div>
        </section>

        {/* ROI CALCULATOR SECTION */}
        <section id="roi" className="scroll-mt-16 border-b border-slate-200 bg-slate-50 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {t.roiLabel}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {t.roiHeading}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {t.roiSubtitle}
              </p>
            </div>

            <div className="mt-12">
              <RoiCalculator />
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="relative overflow-hidden bg-white py-20">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-blue-50 via-transparent to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-6xl px-5">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-8 text-center shadow-2xl shadow-slate-200/50 backdrop-blur-xl sm:p-14">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                {t.finalCtaHeading}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
                {t.finalCtaSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40"
                >
                  <span>{t.finalCtaCreateAccount}</span>
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                >
                  <span>{t.finalCtaSignIn}</span>
                  <CaretRight size={14} weight="bold" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <ScrollToTop />
    </div>
  );
}
