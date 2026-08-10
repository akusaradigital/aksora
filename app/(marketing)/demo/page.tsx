import type { Metadata } from "next";
import Link from "next/link";
import {
  PlayCircle,
  ArrowRight,
  CalendarBlank,
  Bug,
  TrendUp,
  CheckCircle,
  Monitor,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Demo — See Aksora in Action",
  description:
    "Explore how Aksora helps teams plan tests, execute sessions, track bugs, and generate reports. Interactive walkthrough and live preview.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">Product Demo</p>
          <h1 className="text-3xl font-bold sm:text-4xl">See how teams manage quality with Aksora</h1>
          <p className="mt-4 text-[15px] text-gray-400 max-w-2xl mx-auto">
            A guided walkthrough of the platform — from creating your first test plan to generating automated quality reports.
          </p>
        </div>
      </section>

      {/* Video Placeholder */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="border border-gray-200 bg-gray-950 p-16 flex flex-col items-center justify-center text-center">
            <Monitor size={48} weight="bold" className="text-blue-400 mb-4" />
            <h2 className="text-lg font-bold text-white">Product Walkthrough</h2>
            <p className="mt-2 text-[13px] text-gray-400 max-w-md">
              A comprehensive 5-minute walkthrough showing the complete QA workflow — from test planning to automated reporting.
            </p>
            <p className="mt-6 text-[11px] text-gray-500 border border-white/10 px-4 py-2">
              Video coming soon — in the meantime, try the live product free
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">Workflow</p>
            <h2 className="text-2xl font-bold text-gray-900">From chaos to clarity in 4 steps</h2>
            <p className="mt-2 text-[13px] text-gray-500 max-w-md mx-auto">The complete QA lifecycle, streamlined into a repeatable process.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StepCard num="01" title="Plan" desc="Define test plans, organize suites, assign scope to team members. Link everything to your current sprint." icon={<CalendarBlank size={20} weight="bold" />} />
            <StepCard num="02" title="Execute" desc="Run test sessions with your team. Record pass, fail, or blocked verdicts in real-time with evidence." icon={<PlayCircle size={20} weight="bold" />} />
            <StepCard num="03" title="Track" desc="Log bugs with full context — severity, steps, evidence. Monitor resolution through the complete lifecycle." icon={<Bug size={20} weight="bold" />} />
            <StepCard num="04" title="Report" desc="Auto-generated quality reports, health scores, and trend analysis. No manual compilation needed." icon={<TrendUp size={20} weight="bold" />} />
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">What you get on day one</h2>
            <p className="mt-2 text-[13px] text-gray-500 max-w-md mx-auto">No configuration required. These capabilities are available immediately after signup.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <BenefitItem text="Structured test case library with preconditions and steps" />
            <BenefitItem text="Test execution sessions with real-time pass rate tracking" />
            <BenefitItem text="Integrated bug tracker with full lifecycle management" />
            <BenefitItem text="Sprint planning and Kanban task management" />
            <BenefitItem text="Auto-generated dashboard with quality health score" />
            <BenefitItem text="Role-based access for your entire team (8 roles)" />
            <BenefitItem text="Activity audit trail for complete traceability" />
            <BenefitItem text="Excel import to migrate from spreadsheets instantly" />
            <BenefitItem text="Meeting notes for standups and retrospectives" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">The best demo is the real product</h2>
          <p className="mt-4 text-[14px] text-gray-400 max-w-lg mx-auto">
            Create a free workspace in under 2 minutes. Explore every feature with your team — no credit card, no sales call, no time limit.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="group inline-flex items-center gap-2 bg-blue-600 px-7 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all hover:translate-y-[-1px]">
              Start Free — No Card Required
              <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/features" className="inline-flex items-center gap-1.5 border border-white/15 px-7 py-3 text-[13px] font-medium text-gray-300 hover:bg-white/5 transition-colors">
              Explore Features
            </Link>
          </div>
          <p className="mt-5 text-[11px] text-gray-500">Free plan includes up to 5 team members · No credit card required · Setup in under 2 minutes</p>
        </div>
      </section>
    </>
  );
}

function StepCard({ num, title, desc, icon }: { num: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <article className="border border-gray-200 bg-white p-6 relative overflow-hidden hover:border-blue-200 transition-colors">
      <span className="absolute top-4 right-5 text-3xl font-bold text-gray-100" aria-hidden="true">{num}</span>
      <div className="relative">
        <div className="mb-4 text-blue-600" aria-hidden="true">{icon}</div>
        <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </article>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 border border-gray-200 bg-white p-4">
      <CheckCircle size={16} weight="bold" className="shrink-0 text-emerald-500 mt-0.5" aria-hidden="true" />
      <p className="text-[12px] text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}
