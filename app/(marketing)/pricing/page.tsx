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
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">Pricing</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Plans that scale with your team</h1>
          <p className="mt-4 text-[15px] text-gray-400 max-w-2xl mx-auto">
            Start free with full functionality for small teams. Upgrade as your QA operations grow. No hidden fees, no per-feature charges, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <PricingSection />
        </div>
      </section>

      {/* All plans include */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-gray-900">All plans include</h2>
            <p className="mt-2 text-[13px] text-gray-500">Core capabilities available on every plan, including free.</p>
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
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
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
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Start building quality today</h2>
          <p className="mt-4 text-[14px] text-gray-400 max-w-lg mx-auto">
            Create your workspace in under 2 minutes. No credit card required for free plan or Pro trial.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="group inline-flex items-center gap-2 bg-blue-600 px-7 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all hover:translate-y-[-1px]">
              Get Started Free
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

function IncludedItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-white border border-gray-200 px-4 py-3">
      <CheckCircle size={14} weight="bold" className="shrink-0 text-emerald-500" aria-hidden="true" />
      <span className="text-[12px] text-gray-700">{text}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border border-gray-200 bg-white p-6">
      <h3 className="text-[13px] font-bold text-gray-900">{q}</h3>
      <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">{a}</p>
    </div>
  );
}
