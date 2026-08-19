import type { Metadata } from "next";
import Link from "next/link";
import {
  EnvelopeSimple,
  MapPin,
  ChatCircle,
  Clock,
  ArrowRight,
  Buildings,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Contact — Talk to Our Team",
  description:
    "Get in touch with the Aksora team for sales inquiries, technical support, partnerships, or general questions.",
  alternates: { canonical: "/contact" },
};

export const revalidate = 3600;

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">Contact Us</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Let&apos;s talk about your QA needs</h1>
          <p className="mt-4 text-[15px] text-gray-400 max-w-xl mx-auto">
            Whether you&apos;re evaluating Aksora for your team, need technical support, or want to explore a partnership — we&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            <ContactCard
              icon={<Buildings size={20} weight="bold" />}
              title="Sales & Enterprise"
              desc="sales@akusaradigital.com"
              sub="For team plans & custom needs"
            />
            <ContactCard
              icon={<ChatCircle size={20} weight="bold" />}
              title="Technical Support"
              desc="support@akusaradigital.com"
              sub="For existing customers"
            />
            <ContactCard
              icon={<EnvelopeSimple size={20} weight="bold" />}
              title="General Inquiries"
              desc="hello@akusaradigital.com"
              sub="Partnerships & press"
            />
            <ContactCard
              icon={<Clock size={20} weight="bold" />}
              title="Response Time"
              desc="Within 24 hours"
              sub="Mon–Fri, business hours"
            />
          </div>

          {/* Contact Form */}
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3 border border-gray-200 bg-white p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Send us a message</h2>
              <p className="text-[12px] text-gray-500 mb-6">Fill out the form below and our team will get back to you within one business day.</p>
              <form className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Full Name *</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-0 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Work Email *</label>
                    <input
                      type="email"
                      placeholder="john@team.com"
                      className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-0 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Workspace</label>
                    <input
                      type="text"
                      placeholder="Workspace name"
                      className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-0 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Topic</label>
                    <select className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 focus:border-blue-600 focus:ring-0 focus:outline-none transition-colors appearance-none">
                      <option value="">Select a topic</option>
                      <option value="sales">Sales & Pricing</option>
                      <option value="support">Technical Support</option>
                      <option value="enterprise">Enterprise Plan</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Message *</label>
                  <textarea
                    rows={5}
                    placeholder="How can we help your team?"
                    className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-0 focus:outline-none transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-gray-200 bg-white p-6">
                <h3 className="text-[13px] font-bold text-gray-900 mb-3">For Enterprise Teams</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed mb-4">
                  Need custom integrations, SSO, dedicated support, or on-premise deployment? Our enterprise team can help design a solution for your organization.
                </p>
                <Link href="/pricing" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700">
                  View Enterprise Plan
                  <ArrowRight size={12} weight="bold" />
                </Link>
              </div>
              <div className="border border-gray-200 bg-white p-6">
                <h3 className="text-[13px] font-bold text-gray-900 mb-3">Quick Start</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed mb-4">
                  Want to try Aksora right now? Create a free workspace in under 2 minutes — no sales call required.
                </p>
                <Link href="/login" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700">
                  Start Free
                  <ArrowRight size={12} weight="bold" />
                </Link>
              </div>
              <div className="border border-gray-200 bg-white p-6">
                <MapPin size={18} weight="bold" className="text-blue-600 mb-3" />
                <h3 className="text-[13px] font-bold text-gray-900 mb-1">Headquarters</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  Aksora by <a href="https://akusaradigital.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Akusara Digital</a><br />
                  Indonesia
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactCard({ icon, title, desc, sub }: { icon: React.ReactNode; title: string; desc: string; sub: string }) {
  return (
    <div className="border border-gray-200 bg-white p-5">
      <div className="text-blue-600 mb-3" aria-hidden="true">{icon}</div>
      <h3 className="text-[12px] font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-[12px] font-medium text-gray-700">{desc}</p>
      <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>
    </div>
  );
}
