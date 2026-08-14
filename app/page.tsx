import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bug,
  Checks,
  ChartBar,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { PricingSection } from "@/components/landing/pricing-toggle";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aksora - One Team. One Flow.",
  description:
    "Plan tests, execute sessions, track bugs, and measure quality health in one workspace.",
  alternates: { canonical: "/" },
};

const featureCards = [
  {
    icon: ShieldCheck,
    title: "Role access",
    text: "Keep each view scoped to the right team.",
  },
  {
    icon: Checks,
    title: "Test runs",
    text: "Record pass, fail, or blocked without switching tools.",
  },
  {
    icon: Bug,
    title: "Bug reports",
    text: "Capture evidence, severity, and ownership in one place.",
  },
  {
    icon: ChartBar,
    title: "Quality health",
    text: "See the signal you need without a heavy landing page.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50 text-slate-900">
      <MarketingHeader />

      <main className="pt-14">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
                One Team. One Flow.
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Keep test plans, runs, and bugs in one place.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                Aksora keeps the QA work your team uses every day close together,
                without asking the landing page to do the app's job.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Create account
                  <ArrowRight size={14} weight="bold" aria-hidden="true" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
                >
                  See pricing
                </a>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Existing users can sign in from the login page.
              </p>
            </div>

            <aside className="grid gap-4 border border-slate-200 bg-slate-50 p-5">
              <div className="border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Built for QA teams
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The home page stays quiet. The app keeps the working detail.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {featureCards.map((card) => (
                  <div key={card.title} className="border border-slate-200 bg-white p-4">
                    <card.icon size={18} weight="bold" className="text-blue-600" aria-hidden="true" />
                    <h2 className="mt-3 text-sm font-semibold text-slate-950">{card.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{card.text}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section id="features" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600">
                What is in the workspace
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                A small set of views, each with a clear job.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The landing page gives you the shape of the product. The app handles
                the work.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <InfoCard
                title="Plan tests"
                text="Organize cases and keep the next run easy to find."
                className="lg:col-span-2"
              />
              <InfoCard
                title="Run sessions"
                text="Capture results as the test is happening."
                className="lg:col-span-2"
              />
              <InfoCard
                title="Track bugs"
                text="Attach evidence and move the report to the right owner."
                className="lg:col-span-2"
              />
              <InfoCard
                title="Review progress"
                text="Check the health of a release without extra clutter."
                className="lg:col-span-3"
              />
              <InfoCard
                title="Integrate via API"
                text="Push data in and out using personal API keys."
                href="/docs/api"
                className="md:col-span-2 lg:col-span-3"
              />
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600">
                Pricing
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Pick a starting point that fits the team.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Clear plan names, simple billing, and no decorative promises.
              </p>
            </div>

            <div className="mt-10">
              <PricingSection />
            </div>
          </div>
        </section>

        <section id="roi" className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600">
                Estimate
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Estimate the time your team gets back.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Adjust the inputs to see a rough savings estimate for your team.
              </p>
            </div>

            <div className="mt-10">
              <RoiCalculator />
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="flex flex-col gap-4 border border-slate-200 bg-slate-50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600">
                  Ready to sign in
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Open the app when you are ready.
                </h2>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
              >
                Open login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <ScrollToTop />
    </div>
  );
}

function InfoCard({
  title,
  text,
  href,
  linkText,
  className,
}: {
  title: string;
  text: string;
  href?: string;
  linkText?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between border border-slate-200 bg-white p-5", className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      </div>
      {href && (
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            {linkText || "Learn more"} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      )}
    </div>
  );
}
