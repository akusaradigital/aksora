import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Lightbulb,
  ShieldCheck,
  TrendUp,
  UsersThree,
  Globe,
  Handshake,
  Target,
  ChartLineUp,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "About — Aksora: One Team. One Flow.",
  description:
    "Aksora is the workspace for engineering teams: plan tests, run sessions, track bugs, manage sprints, and auto-generate reports. Built by Akusara Digital.",
  alternates: { canonical: "/about" },
};

export const revalidate = 3600;

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">About Aksora</p>
            <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl leading-tight">
              One workspace for your whole team to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">plan, ship, and improve together.</span>
            </h1>
            <p className="mt-6 text-[15px] text-gray-400 leading-relaxed max-w-2xl">
              Aksora brings test planning, execution, bug tracking, sprints, and reporting into a single flow — so every engineering team knows what was tested, what broke, and what ships next.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-blue-50 flex items-center justify-center">
                  <Target size={16} weight="bold" className="text-blue-600" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600">Our Mission</p>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Eliminate the gap between how teams work and how they track quality.</h2>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Too many QA teams still rely on disconnected spreadsheets, scattered documents, and tools that weren&apos;t designed for their workflow. We&apos;re building the unified platform that brings test planning, execution, bug tracking, and reporting into a single, intuitive workspace.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-violet-50 flex items-center justify-center">
                  <Lightbulb size={16} weight="bold" className="text-violet-600" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-600">Our Vision</p>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">A world where quality is visible, measurable, and continuously improving.</h2>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                We envision a future where every engineering team — from 3-person startups to 300-person organizations — has real-time visibility into their quality health. Where decisions are data-driven, not gut-driven. Where QA is a strategic advantage, not an afterthought.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-3xl mx-auto">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">Our Story</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Born from real frustration, built with real experience.</h2>
            <div className="space-y-5 text-[13px] text-gray-600 leading-relaxed">
              <p>
                Aksora was born inside a software development team where the QA crew faced a common but painful reality: test cases scattered across Google Docs, bugs lost in Slack threads, and sprint reviews that required hours of manual report compilation.
              </p>
              <p>
                The team evaluated existing solutions. Enterprise tools like TestRail and Zephyr offered comprehensive features but came with steep learning curves, complex pricing, and months of onboarding. Lightweight alternatives lacked the depth needed for serious QA operations.
              </p>
              <p>
                The gap was clear: there was no tool that combined professional-grade QA capabilities with the simplicity and speed that modern teams expect. So we built one.
              </p>
              <p>
                Today, Aksora serves as a complete quality and workflow platform — covering the full lifecycle from test planning through execution, bug tracking, sprint management, and automated reporting — while maintaining the setup simplicity of a consumer product.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 mb-2">Core Values</p>
            <h2 className="text-2xl font-bold text-gray-900">The principles that guide everything we build.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ValueCard
              icon={<TrendUp size={20} weight="bold" />}
              color="text-blue-600"
              bg="bg-blue-50"
              title="Simplicity Over Complexity"
              desc="Every feature must earn its place. We ruthlessly prioritize clarity and ease of use over feature count. If it takes more than 2 minutes to set up, we've failed."
            />
            <ValueCard
              icon={<ShieldCheck size={20} weight="bold" />}
              color="text-emerald-600"
              bg="bg-emerald-50"
              title="Security by Default"
              desc="Data isolation, role-based access, encrypted sessions, and audit logging are not premium features — they're baseline expectations we deliver to every user."
            />
            <ValueCard
              icon={<UsersThree size={20} weight="bold" />}
              color="text-violet-600"
              bg="bg-violet-50"
              title="Built for Teams"
              desc="QA is a team sport. Every design decision considers how information flows between QA engineers, developers, PMs, and engineering managers."
            />
            <ValueCard
              icon={<ChartLineUp size={20} weight="bold" />}
              color="text-amber-600"
              bg="bg-amber-50"
              title="Data-Driven Quality"
              desc="We believe quality should be measurable. Automated reports, health scores, and trend analysis turn subjective opinions into objective insights."
            />
            <ValueCard
              icon={<Globe size={20} weight="bold" />}
              color="text-cyan-600"
              bg="bg-cyan-50"
              title="Accessible to All"
              desc="Professional QA tools shouldn't require enterprise budgets. Our free tier is genuinely useful, and our paid plans are priced for growing teams, not Fortune 500s."
            />
            <ValueCard
              icon={<Handshake size={20} weight="bold" />}
              color="text-rose-600"
              bg="bg-rose-50"
              title="Customer Partnership"
              desc="We build with our users, not just for them. Feature priorities are shaped by real feedback from real QA teams using the platform daily."
            />
          </div>
        </div>
      </section>

      {/* Team Info */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">The Team</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Akusara Digital</h2>
              <div className="space-y-4 text-[13px] text-gray-600 leading-relaxed">
                <p>
                  Aksora is developed and maintained by <strong className="text-gray-900">Akusara Digital</strong>, a software engineering studio based in Indonesia focused on building developer productivity tools.
                </p>
                <p>
                  Our team combines deep experience in software quality assurance, full-stack development, and product design. We understand the QA workflow because we live it every day.
                </p>
                <p>
                  We&apos;re a small, focused team that moves fast and ships often. We believe the best products come from teams that use their own tools — and we use Aksora to manage our own quality processes.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard value="2024" label="Founded" />
              <StatCard value="Indonesia" label="Headquarters" />
              <StatCard value="Weekly" label="Release Cadence" />
              <StatCard value="100%" label="Bootstrapped" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to modernize your QA workflow?</h2>
          <p className="mt-4 text-[14px] text-gray-400 max-w-lg mx-auto">
            Join teams who have replaced spreadsheets and fragmented tools with a unified quality management platform.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="group inline-flex items-center gap-2 bg-blue-600 px-7 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all hover:translate-y-[-1px]">
              Start Free — No Card Required
              <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-1.5 border border-white/15 px-7 py-3 text-[13px] font-medium text-gray-300 hover:bg-white/5 transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ValueCard({ icon, color, bg, title, desc }: { icon: React.ReactNode; color: string; bg: string; title: string; desc: string }) {
  return (
    <article className="border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center ${bg} ${color}`} aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">{desc}</p>
    </article>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-gray-200 bg-white p-5 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
