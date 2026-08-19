import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardText,
  Checks,
  PlayCircle,
  Bug,
  Kanban,
  ChartBar,
  ShieldCheck,
  Users,
  Timer,
  Note,
  ArrowRight,
  Globe,
  Database,
  Lock,
  FileXls,
  Bell,
  MagnifyingGlass,
  Gear,
  CalendarBlank,
  Lightning,
  Trophy,
  Rocket,
} from "@phosphor-icons/react/dist/ssr";
import { FeatureRow, CompareRow } from "./feature-components";
import {
  MockTestPlan,
  MockTestCase,
  MockExecution,
  MockBugTracker,
  MockKanban,
  MockDashboard,
} from "./feature-mocks";

export const metadata: Metadata = {
  title: "Features — Complete Quality & Workflow Platform",
  description:
    "Test plans, test cases, execution sessions, bug tracking, sprint management, dashboards, and automated reports. All in one integrated workspace.",
  alternates: { canonical: "/features" },
};

export const revalidate = 3600;

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-950 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-5 py-28 text-center relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">Platform Features</p>
          <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl leading-tight">
            A complete quality management<br className="hidden sm:block" /> platform for modern teams
          </h1>
          <p className="mt-5 text-[15px] text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Six integrated modules covering the full QA lifecycle — from test planning through execution, bug tracking, and automated reporting. No plugins, no add-ons, no fragmentation.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-[13px] text-gray-500">
            <span className="flex items-center gap-2"><Lightning size={14} weight="bold" className="text-amber-400" /> Setup in 2 minutes</span>
            <span className="flex items-center gap-2"><Users size={14} weight="bold" className="text-emerald-400" /> Built for teams of 3–100</span>
            <span className="flex items-center gap-2"><Globe size={14} weight="bold" className="text-blue-400" /> 99.9% uptime SLA</span>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <StatItem value="10,000+" label="Test cases managed" />
            <StatItem value="6" label="Integrated modules" />
            <StatItem value="8" label="Granular roles" />
            <StatItem value="< 2 min" label="Average setup time" />
          </div>
        </div>
      </section>

      {/* Core Modules - Detailed with Mock UI */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">Core Modules</p>
            <h2 className="text-2xl font-bold text-gray-900">Six modules. One unified workflow.</h2>
            <p className="mt-2 text-[13px] text-gray-500 max-w-lg mx-auto">Each module is designed to work independently or together as a complete system.</p>
          </div>

          <div className="space-y-20">
            <FeatureRow number="01" icon={<ClipboardText size={24} weight="bold" />} color="text-blue-600" bg="bg-blue-50" title="Test Plans & Suites" desc="Organize your testing strategy with structured test plans linked to sprints and releases. Group test cases into logical suites, track coverage across features, and ensure nothing falls through the cracks." bullets={["Link plans to sprints and releases", "Hierarchical suite organization", "Coverage tracking per feature/module", "Clone plans for regression cycles"]} mockUI={<MockTestPlan />} />
            <FeatureRow number="02" icon={<Checks size={24} weight="bold" />} color="text-emerald-600" bg="bg-emerald-50" title="Test Case Library" desc="Build a reusable library of test cases with structured preconditions, step-by-step instructions, and expected results. Import from Excel, maintain version history, and share across plans." bullets={["Preconditions, steps, expected results", "Excel import/export", "Reusable across multiple plans", "Categorize by module and type"]} mockUI={<MockTestCase />} reverse />
            <FeatureRow number="03" icon={<PlayCircle size={24} weight="bold" />} color="text-amber-600" bg="bg-amber-50" title="Test Execution Sessions" desc="Execute test cases in structured sessions. Record pass/fail/blocked verdicts in real-time, attach evidence, and see pass rates update instantly as your team works through the suite." bullets={["Real-time pass rate tracking", "Attach screenshots and evidence", "Block tracking with reasons", "Session history and comparison"]} mockUI={<MockExecution />} />
            <FeatureRow number="04" icon={<Bug size={24} weight="bold" />} color="text-rose-600" bg="bg-rose-50" title="Bug Tracking" desc="Log bugs with full context — severity, priority, steps to reproduce, expected vs actual results, and evidence. Track the complete lifecycle from discovery through verification and closure." bullets={["Severity and priority classification", "Full lifecycle management", "Link bugs to test cases", "Evidence attachments and screenshots"]} mockUI={<MockBugTracker />} reverse />
            <FeatureRow number="05" icon={<Kanban size={24} weight="bold" />} color="text-violet-600" bg="bg-violet-50" title="Tasks & Sprint Management" desc="Plan sprints, manage tasks with Kanban boards, and keep development and QA perfectly synchronized. Status workflows ensure everyone knows what's in progress, blocked, or done." bullets={["Kanban board view", "Sprint planning and tracking", "Custom status workflows", "Dev and QA task alignment"]} mockUI={<MockKanban />} />
            <FeatureRow number="06" icon={<ChartBar size={24} weight="bold" />} color="text-indigo-600" bg="bg-indigo-50" title="Dashboard & Automated Reports" desc="Get instant visibility into quality health with auto-generated dashboards. Quality scores, burndown charts, trend analysis, and weekly digests — all computed automatically from your data." bullets={["Quality health score", "Burndown and trend charts", "Automated weekly digest", "Custom date range analysis"]} mockUI={<MockDashboard />} reverse />
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">Platform Capabilities</p>
            <h2 className="text-2xl font-bold text-gray-900">Built-in features that enterprise teams expect</h2>
            <p className="mt-2 text-[13px] text-gray-500 max-w-lg mx-auto">No plugins or third-party integrations required. Everything works out of the box.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniFeature icon={<ShieldCheck size={18} weight="bold" />} title="Role-Based Access Control" desc="8 granular roles with scoped permissions. Each team member sees exactly what they need." />
            <MiniFeature icon={<Users size={18} weight="bold" />} title="Multi-Tenant Workspaces" desc="Complete data isolation per workspace. Invite members, manage permissions centrally." />
            <MiniFeature icon={<Timer size={18} weight="bold" />} title="Full Audit Trail" desc="Every action logged with timestamp, user, and details. Complete traceability for compliance." />
            <MiniFeature icon={<Note size={18} weight="bold" />} title="Meeting Notes" desc="Document standups, retros, and decisions alongside your QA data. Context stays together." />
            <MiniFeature icon={<Lock size={18} weight="bold" />} title="Encrypted Sessions" desc="TLS in transit, encrypted cookies, secure password hashing. Security is not optional." />
            <MiniFeature icon={<Database size={18} weight="bold" />} title="Data Export" desc="Export all your data anytime in standard formats. No vendor lock-in, ever." />
            <MiniFeature icon={<FileXls size={18} weight="bold" />} title="Excel Import/Export" desc="Migrate from spreadsheets seamlessly. Export reports for stakeholders who prefer Excel." />
            <MiniFeature icon={<Bell size={18} weight="bold" />} title="Notifications" desc="Stay informed about assignments, status changes, and team activity without checking manually." />
            <MiniFeature icon={<MagnifyingGlass size={18} weight="bold" />} title="Global Search" desc="Find any test case, bug, or task instantly. Search across all modules from one place." />
            <MiniFeature icon={<Globe size={18} weight="bold" />} title="99.9% Uptime" desc="Enterprise-grade infrastructure with automated backups and monitoring." />
            <MiniFeature icon={<CalendarBlank size={18} weight="bold" />} title="Activity Timeline" desc="See what happened across your workspace. Filter by module, user, or date range." />
            <MiniFeature icon={<Gear size={18} weight="bold" />} title="Customizable Workflows" desc="Configure statuses, priorities, and fields to match your team's existing process." />
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">Why Switch</p>
            <h2 className="text-2xl font-bold text-gray-900">Aksora vs the alternatives</h2>
            <p className="mt-2 text-[13px] text-gray-500 max-w-lg mx-auto">Stop duct-taping spreadsheets and generic project tools. Use a platform built specifically for QA.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-[200px]">Capability</th>
                  <th className="pb-3 px-4 text-center text-[11px] font-semibold uppercase tracking-wider text-blue-600">Aksora</th>
                  <th className="pb-3 px-4 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Spreadsheets</th>
                  <th className="pb-3 px-4 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Jira / Linear</th>
                  <th className="pb-3 pl-4 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">TestRail</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow feature="Test case management" ours={true} spreadsheet={false} jira={false} testrail={true} />
                <CompareRow feature="Bug tracking" ours={true} spreadsheet={false} jira={true} testrail={false} />
                <CompareRow feature="Sprint management" ours={true} spreadsheet={false} jira={true} testrail={false} />
                <CompareRow feature="Test execution sessions" ours={true} spreadsheet={false} jira={false} testrail={true} />
                <CompareRow feature="Automated quality reports" ours={true} spreadsheet={false} jira={false} testrail="partial" />
                <CompareRow feature="Role-based access (8 roles)" ours={true} spreadsheet={false} jira="partial" testrail="partial" />
                <CompareRow feature="All-in-one (no plugins)" ours={true} spreadsheet={false} jira={false} testrail={false} />
                <CompareRow feature="Free plan available" ours={true} spreadsheet={true} jira="partial" testrail={false} />
                <CompareRow feature="Setup time" ours="2 min" spreadsheet="Hours" jira="Days" testrail="30 min" />
                <CompareRow feature="Learning curve" ours="Low" spreadsheet="Low" jira="High" testrail="Medium" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Workflow Timeline */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">How It Works</p>
            <h2 className="text-2xl font-bold text-gray-900">From zero to full QA coverage in minutes</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <TimelineStep step={1} icon={<Rocket size={20} weight="bold" />} title="Create workspace" desc="Sign up, name your workspace, invite your team. Done in under 2 minutes." />
            <TimelineStep step={2} icon={<ClipboardText size={20} weight="bold" />} title="Build test library" desc="Import from Excel or create test cases directly. Organize into suites and plans." />
            <TimelineStep step={3} icon={<PlayCircle size={20} weight="bold" />} title="Execute & track" desc="Run test sessions, log bugs, manage sprints. Everything stays connected." />
            <TimelineStep step={4} icon={<Trophy size={20} weight="bold" />} title="Ship with confidence" desc="Automated reports show quality health. Know exactly when you're ready to release." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">See it in action</h2>
          <p className="mt-3 text-[14px] text-gray-400 max-w-lg mx-auto">
            Create a free workspace and explore every feature. No credit card, no time limit on the free plan.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="group inline-flex items-center gap-2 bg-blue-600 px-7 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all hover:translate-y-[-1px]">
              Start Free — Takes 2 Minutes
              <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-1.5 border border-white/15 px-7 py-3 text-[13px] font-medium text-gray-300 hover:bg-white/5 transition-colors">
              Try Live Demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}


// ─── Stats Item ──────────────────────────────────────────────────────────────
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Timeline Step ───────────────────────────────────────────────────────────
function TimelineStep({ step, icon, title, desc }: { step: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-8 w-8 items-center justify-center bg-blue-600 text-white text-[11px] font-bold">
          {step}
        </div>
        <span className="text-blue-600">{icon}</span>
      </div>
      <h3 className="text-[13px] font-bold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Mini Feature Card ───────────────────────────────────────────────────────
function MiniFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="border border-gray-200 bg-white p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
      <span className="text-blue-600 mb-3 block group-hover:scale-110 transition-transform origin-left" aria-hidden="true">{icon}</span>
      <p className="text-[12px] font-bold text-gray-900">{title}</p>
      <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

