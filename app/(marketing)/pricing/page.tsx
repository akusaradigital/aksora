import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { PricingSection } from "@/components/landing/pricing-toggle";

export const metadata: Metadata = {
  title: "Pricing — Plans That Scale With Your Team",
  description:
    "Start free with up to 5 team members. Scale to Pro or Enterprise as your QA operations grow. Transparent pricing, no hidden fees.",
  alternates: { canonical: "/pricing" },
};

export const revalidate = 3600;

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-visible bg-gradient-to-b from-[#1e3a8a] via-[#1d4ed8] to-[#1e40af] pt-20 pb-24 text-center text-white px-5 sm:px-8 border-b border-blue-900/60 shadow-inner">
        <div className="mx-auto max-w-4xl">
          <span className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-200 border border-blue-400/30 mb-3">
            Pricing
          </span>
          <h1 className="text-3xl font-extrabold sm:text-5xl tracking-tight text-white">
            Plans that scale with your team
          </h1>
          <p className="mt-4 text-sm sm:text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Start free with full functionality for small teams. Upgrade as your QA operations grow. No hidden fees, no per-feature charges, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-colors">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <PricingSection />
        </div>
      </section>

      {/* All plans include */}
      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 transition-colors">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">All plans include</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">Core capabilities available on every plan, including free.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <IncludedItem text="Role-based access control (8 roles)" />
            <IncludedItem text="Full audit trail" />
            <IncludedItem text="Encrypted sessions & data" />
            <IncludedItem text="Test case management" />
            <IncludedItem text="Bug tracking with lifecycle" />
            <IncludedItem text="Dashboard & quality metrics" />
            <IncludedItem text="Meeting notes" />
            <IncludedItem text="Activity timeline" />
            <IncludedItem text="Data export" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-colors">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            <FaqItem q="Is the free plan really free forever?" a="Yes. The Starter plan has no time limit and no credit card requirement. It's designed for small teams (up to 5 members) who need professional QA tools without the cost. You'll never be forced to upgrade." />
            <FaqItem q="Can I switch plans at any time?" a="Absolutely. Upgrade or downgrade at any time from your workspace settings. Upgrades are pro-rated, and downgrades take effect at the end of your current billing cycle. Your data is always preserved." />
            <FaqItem q="What payment methods do you accept?" a="We accept all major credit cards (Visa, Mastercard, American Express) via secure payment processing. Enterprise plans can be invoiced with NET-30 terms." />
            <FaqItem q="Is there a free trial for Pro?" a="Yes — 14 days of full Pro features, no credit card required. At the end of the trial, you can choose to subscribe or your workspace automatically reverts to the Starter plan." />
            <FaqItem q="What happens to my data if I downgrade?" a="Your data is never deleted when changing plans. If you exceed the limits of a lower plan, you'll retain read access to all data but won't be able to create new items until you're within limits." />
            <FaqItem q="Do you offer discounts for startups or nonprofits?" a="Yes. We offer 50% off Pro plans for verified startups (under 2 years old, under $1M ARR) and registered nonprofits. Contact sales@akusaradigital.com with verification." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white dark:bg-slate-950 py-16 px-5 sm:px-8 transition-colors">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 px-8 py-16 text-center text-white shadow-xl">
          <h2 className="text-2xl font-extrabold sm:text-4xl">Start building quality today</h2>
          <p className="mt-4 text-sm text-blue-100 max-w-lg mx-auto">
            Create your workspace in under 2 minutes. No credit card required for free plan or Pro trial.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="rounded-full bg-[#a3e635] px-7 py-3 text-xs font-bold text-slate-950 shadow-md transition hover:bg-[#bef264]">
              Get Started Free
            </Link>
            <Link href="/contact" className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-xs font-semibold text-white hover:bg-white/20 transition">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function IncludedItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-2xs">
      <CheckCircle size={15} weight="bold" className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{text}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
      <h3 className="text-sm font-bold text-slate-950 dark:text-white">{q}</h3>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{a}</p>
    </div>
  );
}
