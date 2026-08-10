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
      <div className="flex items-center justify-center gap-3 mt-6 mb-10">
        <span className={`text-[12px] font-medium ${billingCycle === "monthly" ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
        <button
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
          className={`relative w-11 h-6 transition-colors ${billingCycle === "yearly" ? "bg-blue-600" : "bg-gray-300"}`}
          aria-label="Toggle billing cycle"
        >
          <span className={`absolute top-1 h-4 w-4 bg-white transition-transform ${billingCycle === "yearly" ? "left-6" : "left-1"}`} />
        </button>
        <span className={`text-[12px] font-medium ${billingCycle === "yearly" ? "text-gray-900" : "text-gray-400"}`}>
          Yearly <span className="text-emerald-600 font-semibold">(-20%)</span>
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Starter */}
        <div className="border border-gray-200 bg-white p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 bg-gray-100 flex items-center justify-center">
              <Users size={16} weight="bold" className="text-gray-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Starter</h3>
              <p className="text-[11px] text-gray-500">For small teams getting started</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-bold text-gray-900">$0</span>
            <span className="text-[12px] text-gray-500 ml-1">/ forever</span>
          </div>
          <div className="space-y-2.5 flex-1">
            <PricingFeature included text="Up to 5 team members" />
            <PricingFeature included text="100 test cases" />
            <PricingFeature included text="Bug tracking" />
            <PricingFeature included text="Basic dashboard" />
            <PricingFeature included text="1 workspace" />
            <PricingFeature included={false} text="Advanced reports" />
            <PricingFeature included={false} text="API access" />
            <PricingFeature included={false} text="Priority support" />
          </div>
          <Link href="/login" className="mt-6 block text-center border border-gray-300 px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Get Started Free
          </Link>
        </div>

        {/* Pro */}
        <div className="border-2 border-blue-600 bg-white p-6 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
            Most Popular
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 bg-blue-50 flex items-center justify-center">
              <Rocket size={16} weight="bold" className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Pro</h3>
              <p className="text-[11px] text-gray-500">For growing QA teams</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-bold text-gray-900">${billingCycle === "yearly" ? "19" : "24"}</span>
            <span className="text-[12px] text-gray-500 ml-1">/ user / month</span>
            {billingCycle === "yearly" && <span className="ml-2 text-[11px] text-emerald-600 font-medium">Save $60/yr</span>}
          </div>
          <div className="space-y-2.5 flex-1">
            <PricingFeature included text="Unlimited team members" />
            <PricingFeature included text="Unlimited test cases" />
            <PricingFeature included text="Advanced bug workflows" />
            <PricingFeature included text="Full dashboard & reports" />
            <PricingFeature included text="5 workspaces" />
            <PricingFeature included text="Sprint analytics" />
            <PricingFeature included text="Excel import/export" />
            <PricingFeature included={false} text="Custom integrations" />
          </div>
          <Link href="/login" className="mt-6 block text-center bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors">
            Start 14-Day Free Trial
          </Link>
        </div>

        {/* Enterprise */}
        <div className="border border-gray-200 bg-white p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 bg-violet-50 flex items-center justify-center">
              <Crown size={16} weight="bold" className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Enterprise</h3>
              <p className="text-[11px] text-gray-500">For large organizations</p>
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-bold text-gray-900">${billingCycle === "yearly" ? "49" : "59"}</span>
            <span className="text-[12px] text-gray-500 ml-1">/ user / month</span>
            {billingCycle === "yearly" && <span className="ml-2 text-[11px] text-emerald-600 font-medium">Save $120/yr</span>}
          </div>
          <div className="space-y-2.5 flex-1">
            <PricingFeature included text="Everything in Pro" />
            <PricingFeature included text="Unlimited workspaces" />
            <PricingFeature included text="Custom integrations & API" />
            <PricingFeature included text="SSO / SAML authentication" />
            <PricingFeature included text="Advanced audit logs" />
            <PricingFeature included text="Dedicated account manager" />
            <PricingFeature included text="SLA guarantee (99.99%)" />
            <PricingFeature included text="On-premise deployment option" />
          </div>
          <Link href="/login" className="mt-6 block text-center border border-gray-300 px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Contact Sales
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
        <X size={14} weight="bold" className="shrink-0 text-gray-300" />
      )}
      <span className={`text-[12px] ${included ? "text-gray-700" : "text-gray-400"}`}>{text}</span>
    </div>
  );
}
