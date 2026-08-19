import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Bug,
  Checks,
  ChartBar,
  Kanban,
  PlayCircle,
  ArrowRight,
  ShieldCheck,
  Users,
  ClipboardText,
  Timer,
  TrendUp,
  CalendarBlank,
  Note,
  Lightning,
  Eye,
  Rocket,
  Buildings,
  Globe,
  Lock,
  Database,
} from "@phosphor-icons/react/dist/ssr";
import { AuthRedirect } from "@/components/landing/auth-redirect";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import {
  StatBadge,
  DashPreviewRow,
  PainPoint,
  SolvePoint,
  FeatureCard,
  StepCard,
  MiniCard,
  TrustCard,
  FaqItem,
} from "./home-components";

const PricingSection = dynamic(
  () => import("@/components/landing/pricing-toggle").then((m) => m.PricingSection),
  { loading: () => <div className="h-96 border border-gray-200 bg-gray-50 animate-pulse" /> },
);

const RoiCalculator = dynamic(
  () => import("@/components/landing/roi-calculator").then((m) => m.RoiCalculator),
  { loading: () => <div className="h-64 bg-white/5 animate-pulse" /> },
);

export const metadata: Metadata = {
  title: "Aksora — One Team. One Flow.",
  description:
    "Plan tests, execute sessions, track bugs, and measure quality health in one workspace. Free for teams up to 5. Replace spreadsheets with a modern QA platform.",
  alternates: { canonical: "/" },
};

export const revalidate = 3600;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 overflow-x-hidden">
      <AuthRedirect />

      <MarketingHeader />

      {/* Hero */}
      <header className="pt-14 bg-gray-950 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-400">One Team. One Flow.</p>
            <div className="mb-6 inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5">
              <Rocket size={12} weight="bold" className="text-amber-400" aria-hidden="true" />
              <span className="text-[11px] font-medium text-gray-300">Built for QA teams who want less noise, more clarity</span>
            </div>

            <h1 className="text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-[52px]">
              QA work that feels
              <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">calm, clear, and easy to ship.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-400">
              Plan tests, run sessions, track bugs, and share status without the spreadsheet drag. One workspace for the team.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="group inline-flex items-center gap-2 bg-blue-600 px-6 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all hover:translate-y-[-1px] rounded-full">
                Start free
                <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <a href="#demo" className="inline-flex items-center gap-1.5 border border-white/15 px-6 py-3 text-[13px] font-medium text-gray-300 hover:bg-white/5 transition-colors rounded-full">
                <Eye size={14} weight="bold" aria-hidden="true" />
                View demo
              </a>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Platform statistics">
              <StatBadge value="500+" label="QA Engineers" />
              <StatBadge value="12K+" label="Bugs Tracked" />
              <StatBadge value="50K+" label="Test Cases" />
              <StatBadge value="99.9%" label="Uptime" />
            </div>
          </div>

          {/* Floating preview */}
          <aside className="hidden lg:block absolute right-5 top-20 w-80 border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5" aria-label="Dashboard preview">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-4">Live Dashboard Preview</p>
            <div className="space-y-3">
              <DashPreviewRow label="Open Bugs" value="12" color="rose" pct={75} />
              <DashPreviewRow label="Test Pass Rate" value="94%" color="emerald" pct={94} />
              <DashPreviewRow label="Sprint Progress" value="67%" color="blue" pct={67} />
              <DashPreviewRow label="Coverage" value="82%" color="violet" pct={82} />
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 flex items-center gap-2">
              <div className="h-2 w-2 bg-emerald-400 animate-pulse" aria-hidden="true" />
              <span className="text-[10px] text-gray-500">Updates in real-time</span>
            </div>
          </aside>
        </div>
      </header>

      {/* Early Adopter Banner */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-1">Get started fast</p>
            <p className="text-[13px] text-gray-600">Create a workspace, invite your team, and start tracking quality in minutes.</p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap">
            Start free
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="border-b border-gray-100" aria-labelledby="problem-heading">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-500 mb-2">The Problem</p>
              <h2 id="problem-heading" className="text-xl font-bold text-gray-900">Sound familiar?</h2>
              <div className="mt-5 space-y-3">
                <PainPoint text="Bugs tracked in random spreadsheets nobody updates" />
                <PainPoint text="Test cases scattered across docs, wikis, and chat" />
                <PainPoint text="No visibility into what was tested this sprint" />
                <PainPoint text="Weekly reports take hours to compile manually" />
                <PainPoint text="New team members have no idea where to start" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 mb-2">The Solution</p>
              <h2 className="text-xl font-bold text-gray-900">One workspace. Full visibility.</h2>
              <div className="mt-5 space-y-3">
                <SolvePoint text="Centralized bug tracker with severity, lifecycle, and evidence" />
                <SolvePoint text="Structured test case library linked to plans and suites" />
                <SolvePoint text="Execution sessions with pass/fail tracking per sprint" />
                <SolvePoint text="Auto-generated reports, health scores, and trend charts" />
                <SolvePoint text="Role-based views — everyone sees exactly what they need" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-gray-100" aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-1">Features</p>
            <h2 id="features-heading" className="text-2xl font-bold text-gray-900">Everything your QA workflow needs</h2>
            <p className="mt-2 text-[13px] text-gray-500 max-w-md mx-auto">From test planning to bug resolution — a complete quality management platform.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={<ClipboardText size={20} weight="bold" />} color="text-blue-600" bg="bg-blue-50" title="Test Plans & Suites" desc="Organize scenarios into plans and suites. Link to sprints. Track coverage across releases." />
            <FeatureCard icon={<Checks size={20} weight="bold" />} color="text-emerald-600" bg="bg-emerald-50" title="Test Case Library" desc="Preconditions, steps, expected results. Reusable across suites and plans. Import from Excel." />
            <FeatureCard icon={<PlayCircle size={20} weight="bold" />} color="text-amber-600" bg="bg-amber-50" title="Test Execution" desc="Run sessions, record verdicts live. See pass rates per cycle instantly. Track blockers." />
            <FeatureCard icon={<Bug size={20} weight="bold" />} color="text-rose-600" bg="bg-rose-50" title="Bug Tracking" desc="Severity, priority, assignee, evidence. Full lifecycle from open to verified-closed." />
            <FeatureCard icon={<Kanban size={20} weight="bold" />} color="text-violet-600" bg="bg-violet-50" title="Tasks & Sprints" desc="Kanban board, sprint planning, status workflows. Keep dev and QA perfectly in sync." />
            <FeatureCard icon={<ChartBar size={20} weight="bold" />} color="text-indigo-600" bg="bg-indigo-50" title="Dashboard & Reports" desc="Quality health score, burndown, heatmaps, weekly digest. All generated automatically." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="demo" className="border-b border-gray-100" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-1">How It Works</p>
            <h2 id="how-heading" className="text-2xl font-bold text-gray-900">From chaos to clarity in 4 steps</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StepCard num="1" title="Plan" desc="Create sprints, define test plans, assign scope to your team." icon={<CalendarBlank size={18} weight="bold" />} />
            <StepCard num="2" title="Execute" desc="Run test sessions. Record pass, fail, or blocked per case." icon={<PlayCircle size={18} weight="bold" />} />
            <StepCard num="3" title="Track" desc="Log bugs instantly. Assign, prioritize, and monitor resolution." icon={<Bug size={18} weight="bold" />} />
            <StepCard num="4" title="Report" desc="Auto-generated weekly reports. Quality health at a glance." icon={<TrendUp size={18} weight="bold" />} />
          </div>
        </div>
      </section>

      {/* More features */}
      <section className="border-b border-gray-100 bg-gray-50" aria-label="Additional features">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniCard icon={<ShieldCheck size={16} weight="bold" />} label="Role-based Access" desc="8 roles: admin, QA, dev, PM, and more. Each sees their scope." />
            <MiniCard icon={<Users size={16} weight="bold" />} label="Team Workspaces" desc="Isolated per workspace. Invite members, manage permissions." />
            <MiniCard icon={<Timer size={16} weight="bold" />} label="Activity Audit" desc="Every create, edit, delete logged. Full traceability." />
            <MiniCard icon={<Note size={16} weight="bold" />} label="Meeting Notes" desc="Standups, retros, decisions — all in one place." />
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="border-b border-gray-100 bg-gray-950 text-white" aria-labelledby="roi-heading">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <RoiCalculator />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-gray-100" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-1">Pricing</p>
            <h2 id="pricing-heading" className="text-2xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-2 text-[13px] text-gray-500 max-w-md mx-auto">Start free, upgrade when you need more. No hidden fees, no surprises.</p>
          </div>
          <PricingSection />
        </div>
      </section>

      {/* Trust / Security */}
      <section className="border-b border-gray-100" aria-label="Security and trust">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TrustCard icon={<Lock size={18} weight="bold" />} title="Secure by Default" desc="End-to-end encryption, role-based access, and audit trails." />
            <TrustCard icon={<Database size={18} weight="bold" />} title="Your Data, Your Rules" desc="Data isolation per workspace. Export anytime. No lock-in." />
            <TrustCard icon={<Globe size={18} weight="bold" />} title="99.9% Uptime" desc="Hosted on enterprise-grade infrastructure with global CDN." />
            <TrustCard icon={<Buildings size={18} weight="bold" />} title="SOC 2 Ready" desc="Built with compliance in mind. Enterprise security standards." />
          </div>
        </div>
      </section>

      {/* FAQ with Schema */}
      <section className="bg-gray-50 border-b border-gray-100" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="text-center mb-10">
            <h2 id="faq-heading" className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            <FaqItem q="Is there really a free plan?" a="Yes! The Starter plan is free forever for teams up to 5 members with 100 test cases. No credit card required to sign up." />
            <FaqItem q="Can I switch plans later?" a="Absolutely. Upgrade or downgrade anytime. Your data is always preserved. Pro-rated billing on upgrades." />
            <FaqItem q="How long does setup take?" a="Under 2 minutes. Create your workspace, invite your team, and start tracking. No complex configuration needed." />
            <FaqItem q="Do you support integrations?" a="Pro plan includes Excel import/export. Enterprise plan adds API access and custom integrations with Jira, Slack, and more." />
            <FaqItem q="What happens to my data if I cancel?" a="Your data remains accessible for 30 days after cancellation. You can export everything at any time." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-950 text-white" aria-label="Call to action">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5 mb-5">
            <Lightning size={12} weight="bold" className="text-amber-400" aria-hidden="true" />
            <span className="text-[11px] font-medium text-gray-300">Set up in minutes and keep the team aligned</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to clean up your QA workflow?</h2>
          <p className="mt-3 text-[14px] text-gray-400 max-w-lg mx-auto">
            Bring planning, execution, bugs, and reporting into one workspace your team can actually keep up with.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="group inline-flex items-center gap-2 bg-blue-600 px-7 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all hover:translate-y-[-1px]">
              Start Free — Takes 2 Minutes
              <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <a href="#pricing" className="inline-flex items-center gap-1.5 border border-white/15 px-7 py-3 text-[13px] font-medium text-gray-300 hover:bg-white/5 transition-colors">
              View Pricing
            </a>
          </div>
          <p className="mt-5 text-[11px] text-gray-500">No credit card required · Free plan available · Setup in under 2 minutes</p>
        </div>
      </section>

      <MarketingFooter />

      <ScrollToTop />
    </div>
  );
}
