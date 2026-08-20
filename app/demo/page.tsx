import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { DemoTabs } from "./demo-tabs";

export const metadata: Metadata = {
  title: "Interactive Demo — Aksora",
  description: "See how test execution, bug tracking, and sprint boards work together in Aksora.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-950 text-slate-100 antialiased">
      <header className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-5 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Aksora" width={22} height={22} className="shrink-0" priority />
          <span className="text-sm font-semibold text-white">Aksora</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft size={14} weight="bold" />
            Back to Home
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500"
          >
            Sign Up Free
            <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
      </header>

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Explore Aksora, no signup required
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Switch between test execution, bug tracking, and sprint boards below to see how Aksora keeps your team in one flow. The data here is a static preview — create a free workspace to use it with your own team.
          </p>

          <DemoTabs />
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
