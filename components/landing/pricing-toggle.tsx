"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Rocket,
  Crown,
  CheckCircle,
  X,
} from "@phosphor-icons/react";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  return (
    <>
      <div className="mb-10 mt-6 flex items-center justify-center gap-3">
        <span className={`text-xs font-semibold ${billingCycle === "monthly" ? "text-slate-950 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>Monthly</span>
        <button
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
          className={`relative h-6 w-11 rounded-full transition-colors ${billingCycle === "yearly" ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
          aria-label="Toggle billing cycle"
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${billingCycle === "yearly" ? "left-6" : "left-1"}`} />
        </button>
        <span className={`text-xs font-semibold ${billingCycle === "yearly" ? "text-slate-950 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
          Yearly <span className="font-bold text-emerald-600 dark:text-emerald-400">(-20%)</span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Users size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Starter</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">For small teams getting set up</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white">$0</span>
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">/ forever</span>
          </div>
          <div className="flex-1 space-y-2.5">
            <PricingFeature included text="Up to 5 team members" />
            <PricingFeature included text="100 test cases" />
            <PricingFeature included text="Bug tracking" />
            <PricingFeature included text="Basic dashboard" />
            <PricingFeature included text="1 workspace" />
            <PricingFeature included={false} text="Advanced reports" />
            <PricingFeature included={false} text="API access" />
            <PricingFeature included={false} text="Priority support" />
          </div>
          <Link href="/login" className="mt-6 block rounded-full border border-slate-300 px-4 py-2 text-center text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Create account
          </Link>
        </div>

        <div className="relative flex flex-col rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-md dark:bg-slate-900 transition-all">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
            Recommended
          </div>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Rocket size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Pro</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">For teams that run QA every day</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white">${billingCycle === "yearly" ? "19" : "24"}</span>
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">/ user / month</span>
            {billingCycle === "yearly" && <span className="ml-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Save $60/yr</span>}
          </div>
          <div className="flex-1 space-y-2.5">
            <PricingFeature included text="Unlimited team members" />
            <PricingFeature included text="Unlimited test cases" />
            <PricingFeature included text="Advanced bug workflows" />
            <PricingFeature included text="Full dashboard and reports" />
            <PricingFeature included text="5 workspaces" />
            <PricingFeature included text="Sprint analytics" />
            <PricingFeature included text="Excel import and export" />
            <PricingFeature included={false} text="Custom integrations" />
          </div>
          <Link href="/login" className="mt-6 block rounded-full bg-[#a3e635] px-4 py-2.5 text-center text-xs font-bold text-slate-950 shadow-sm transition hover:bg-[#bef264]">
            Start 14-Day Trial
          </Link>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Crown size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Enterprise</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">For large organizations</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white">${billingCycle === "yearly" ? "49" : "59"}</span>
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">/ user / month</span>
            {billingCycle === "yearly" && <span className="ml-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Save $120/yr</span>}
          </div>
          <div className="flex-1 space-y-2.5">
            <PricingFeature included text="Everything in Pro" />
            <PricingFeature included text="Unlimited workspaces" />
            <PricingFeature included text="Custom integrations and API" />
            <PricingFeature included text="SSO / SAML authentication" />
            <PricingFeature included text="Advanced audit logs" />
            <PricingFeature included text="Dedicated account manager" />
            <PricingFeature included text="Priority onboarding" />
            <PricingFeature included text="On-premise deployment option" />
          </div>
          <Link href="/contact" className="mt-6 block rounded-full border border-slate-300 px-4 py-2 text-center text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Talk to sales
          </Link>
        </div>
      </div>
    </>
  );
}

function PricingFeature({ included, text }: { included: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {included ? (
        <CheckCircle size={14} weight="bold" className="shrink-0 text-emerald-500" />
      ) : (
        <X size={14} weight="bold" className="shrink-0 text-slate-300" />
      )}
      <span className={`text-xs ${included ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-400 dark:text-slate-500 line-through"}`}>{text}</span>
    </div>
  );
}
