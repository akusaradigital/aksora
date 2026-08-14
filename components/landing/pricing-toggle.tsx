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
        <span className={`text-[12px] font-medium ${billingCycle === "monthly" ? "text-slate-950" : "text-slate-400"}`}>Monthly</span>
        <button
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
          className={`relative h-6 w-11 transition-colors ${billingCycle === "yearly" ? "bg-blue-600" : "bg-slate-300"}`}
          aria-label="Toggle billing cycle"
        >
          <span className={`absolute top-1 h-4 w-4 bg-white transition-transform ${billingCycle === "yearly" ? "left-6" : "left-1"}`} />
        </button>
        <span className={`text-[12px] font-medium ${billingCycle === "yearly" ? "text-slate-950" : "text-slate-400"}`}>
          Yearly <span className="font-semibold text-emerald-600">(-20%)</span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-slate-100">
              <Users size={16} weight="bold" className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-slate-950">Starter</h3>
              <p className="text-[11px] text-slate-500">For small teams getting set up</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-semibold text-slate-950">$0</span>
            <span className="ml-1 text-[12px] text-slate-500">/ forever</span>
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
          <Link href="/login" className="mt-6 block border border-slate-300 px-4 py-2.5 text-center text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950">
            Create account
          </Link>
        </div>

        <div className="relative flex flex-col border-2 border-blue-600 bg-white p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Recommended
          </div>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-blue-50">
              <Rocket size={16} weight="bold" className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-slate-950">Pro</h3>
              <p className="text-[11px] text-slate-500">For teams that run QA every day</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-semibold text-slate-950">${billingCycle === "yearly" ? "19" : "24"}</span>
            <span className="ml-1 text-[12px] text-slate-500">/ user / month</span>
            {billingCycle === "yearly" && <span className="ml-2 text-[11px] font-medium text-emerald-600">Save $60/yr</span>}
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
          <Link href="/login" className="mt-6 block bg-blue-600 px-4 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-blue-700">
            Create account
          </Link>
        </div>

        <div className="flex flex-col border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-slate-100">
              <Crown size={16} weight="bold" className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-slate-950">Enterprise</h3>
              <p className="text-[11px] text-slate-500">For large organizations</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-semibold text-slate-950">${billingCycle === "yearly" ? "49" : "59"}</span>
            <span className="ml-1 text-[12px] text-slate-500">/ user / month</span>
            {billingCycle === "yearly" && <span className="ml-2 text-[11px] font-medium text-emerald-600">Save $120/yr</span>}
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
          <Link href="/login" className="mt-6 block border border-slate-300 px-4 py-2.5 text-center text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950">
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
      <span className={`text-[12px] ${included ? "text-slate-700" : "text-slate-400"}`}>{text}</span>
    </div>
  );
}
