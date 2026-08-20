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
} from "@phosphor-icons/react/dist/ssr";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { PricingSection } from "@/components/landing/pricing-toggle";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { HeroHeadline } from "./hero-headline";

export const metadata: Metadata = {
  title: "Aksora — One Team. One Flow. All-in-One QA & Engineering Workspace",
  description:
    "Plan tests, execute runs, triage defects, manage sprints, and automate daily standups in one unified workspace.",
  alternates: { canonical: "/" },
};

const featureCards = [
  {
    icon: Checks,
    title: "Test Case & Plan Management",
    text: "Structured test suites, reusable test cases, and comprehensive coverage mapping across releases.",
    badge: "Testing",
  },
  {
    icon: Play,
    title: "Live Execution Runs",
    text: "Execute test runs with step-by-step verdicts, real-time status recording, and 1-click defect filing.",
    badge: "Execution",
  },
  {
    icon: Bug,
    title: "End-to-End Bug Tracking",
    text: "Capture reproducible steps, logs, severity, and suggested devs with direct links to failing test runs.",
    badge: "Defects",
  },
  {
    icon: Kanban,
    title: "Sprints & Task Lifecycle",
    text: "Automated sprint transitions, uncompleted task rollover, burndown tracking, and velocity insights.",
    badge: "Agile",
  },
  {
    icon: Lightning,
    title: "Interactive Daily Standup",
    text: "Daily sync pre-filled with yesterday's work, today's focus, and flagged blockers saved to meeting notes.",
    badge: "Productivity",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Tenant Workspaces & RBAC",
    text: "Granular workspace permissions, scoped API keys, custom branding, and isolated data domains.",
    badge: "Security",
  },
] as const;

const keyMetrics = [
  { value: "4.2x", label: "Faster Test Execution Cycle" },
  { value: "100%", label: "Traceability from Run to Defect" },
  { value: "0 ms", label: "Friction in Tool Switching" },
  { value: "99.9%", label: "Real-time Multi-tenant Uptime" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-950 text-slate-100 antialiased">
      <MarketingHeader />

      <main className="pt-14">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-slate-800/80 bg-slate-950 pb-20 pt-16 lg:pb-32 lg:pt-24">
          {/* Ambient Glows */}
          <div
            className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[120px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 backdrop-blur-md">
                <Sparkle size={14} weight="bold" />
                <span>The Unified Engineering &amp; QA Platform</span>
              </div>

              {/* Title */}
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.15]">
                <HeroHeadline
                  variantA={
                    <>
                      One Team. One Flow. <br />
                      <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                        Accelerate Software Quality.
                      </span>
                    </>
                  }
                  variantB={
                    <>
                      Ship Fewer Bugs. <br />
                      <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                        Ship Faster, Together.
                      </span>
                    </>
                  }
                />
              </h1>

              {/* Subtitle */}
              <p className="mt-6 text-base leading-relaxed text-slate-400 sm:text-lg">
                Replace fragmented spreadsheets, disconnected bug trackers, and manual meeting notes. Aksora unites test planning, run execution, defect triage, and sprint workflows in one fast workspace.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/35"
                >
                  <span>Start Free Workspace</span>
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                >
                  <Play size={16} weight="bold" className="text-blue-400" />
                  <span>Interactive Demo</span>
                </Link>
              </div>

              {/* Subtext */}
              <p className="mt-4 text-xs text-slate-500">
                Free for small teams • No credit card required • Instant setup
              </p>
            </div>

            {/* PRODUCT MOCKUP PREVIEW */}
            <div className="relative mt-14 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:p-4">
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                {/* Mockup Window Topbar */}
                <div className="flex h-10 items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 hidden font-mono text-[11px] text-slate-400 sm:inline">
                      aksora.app / workspace / sprint-24-execution
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                      <CheckCircle size={12} weight="bold" /> 94.8% Pass Rate
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400">
                      <Clock size={12} weight="bold" /> Sprint Active
                    </span>
                  </div>
                </div>

                {/* Mockup Dashboard Content Grid */}
                <div className="grid gap-4 p-4 sm:grid-cols-12 sm:p-6">
                  {/* Left: Test Suites & Plans */}
                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 sm:col-span-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Stack size={14} weight="bold" className="text-blue-400" />
                      Test Suites
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between rounded border border-blue-500/30 bg-blue-500/10 p-2.5 text-blue-300">
                        <span className="font-semibold">Authentication &amp; MFA</span>
                        <span className="font-mono text-[11px]">18/18 Pass</span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 p-2.5 text-slate-300">
                        <span>Payment &amp; Checkout Flow</span>
                        <span className="font-mono text-[11px] text-emerald-400">14/15 Pass</span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 p-2.5 text-slate-300">
                        <span>Workspace Switcher RBAC</span>
                        <span className="font-mono text-[11px] text-emerald-400">9/9 Pass</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Live Execution Run Items */}
                  <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 sm:col-span-8">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Play size={14} weight="bold" className="text-emerald-400" />
                        Live Execution Run #24
                      </span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                        In-Progress
                      </span>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500">
                            <th className="pb-2 font-medium">Test Case</th>
                            <th className="pb-2 font-medium">Priority</th>
                            <th className="pb-2 font-medium">Verdict</th>
                            <th className="pb-2 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          <tr>
                            <td className="py-2.5 font-medium text-slate-200">
                              Verify Google OAuth with custom workspace domain
                            </td>
                            <td className="py-2.5 text-slate-400">High</td>
                            <td className="py-2.5">
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                                Passed
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-400">0.4s</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-medium text-slate-200">
                              Prevent negative quantity on checkout recalculate
                            </td>
                            <td className="py-2.5 text-rose-400">Critical</td>
                            <td className="py-2.5">
                              <span className="rounded bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-400">
                                Failed
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span className="cursor-pointer rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                                + Log Bug
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-medium text-slate-200">
                              Export weekly sprint summary as formatted PDF
                            </td>
                            <td className="py-2.5 text-slate-400">Medium</td>
                            <td className="py-2.5">
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                                Passed
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-400">1.2s</td>
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
        <section className="border-b border-slate-800 bg-slate-900/50 py-10">
          <div className="mx-auto max-w-6xl px-5">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
              Trusted by teams like yours
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {["QA Team", "Engineering Squad", "Product Team", "DevOps Crew", "Release Managers"].map((team) => (
                <span key={team} className="text-sm font-semibold text-slate-600 grayscale">
                  {team}
                </span>
              ))}
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              {keyMetrics.map((item) => (
                <div key={item.label} className="p-2">
                  <p className="text-3xl font-extrabold tracking-tight text-blue-400 sm:text-4xl">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="border-b border-slate-800 bg-slate-950 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Core Capabilities
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Built specifically for QA engineers, Devs, &amp; PMs
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                Every workflow in Aksora is designed to reduce friction, keep data in sync, and bring engineering clarity.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className="scroll-reveal group relative rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 transition-all duration-200 hover:border-blue-500/50 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-blue-950/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-lg bg-blue-500/10 p-2.5 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300">
                      <card.icon size={22} weight="bold" aria-hidden="true" />
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-white group-hover:text-blue-300">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="border-b border-slate-800 bg-slate-900/60 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Transparent Pricing
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Simple plans that scale with your team
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                No hidden user seats, no complicated add-ons. Start free and upgrade when your team expands.
              </p>
            </div>

            <div className="scroll-reveal mt-12">
              <PricingSection />
            </div>
          </div>
        </section>

        {/* ROI CALCULATOR SECTION */}
        <section id="roi" className="border-b border-slate-800 bg-slate-950 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                ROI Estimation
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                See how much time your team saves
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                Calculate the engineering hours and budget reclaimed by consolidating QA workflows.
              </p>
            </div>

            <div className="mt-12">
              <RoiCalculator />
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="relative overflow-hidden bg-slate-950 py-20">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-blue-900/20 via-transparent to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-6xl px-5">
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-950/40 to-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-14">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Ready to streamline your QA flow?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
                Join engineering teams that deliver higher quality software with zero friction.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40"
                >
                  <span>Create Free Account</span>
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <span>Sign In to Workspace</span>
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
