"use client";

import { useEffect, useState } from "react";
import { Clock, X, ShieldCheck } from "@phosphor-icons/react";

type PlanStatus = {
  plan: string;
  planExpiry: string | null;
  companyStatus: string;
  daysLeft: number | null;
  expired: boolean;
  suspended: boolean;
};

export function TrialBanner() {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    fetch("/api/auth/plan-status")
      .then((r) => r.json())
      .then((d) => {
        if (d.status) {
          setStatus(d.status);
          // Show blocking modal if expired or suspended
          if (d.status.expired || d.status.suspended) {
            setShowExpiredModal(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  // No status or no expiry concern
  if (!status) return null;
  if (!status.expired && !status.suspended && (status.daysLeft === null || status.daysLeft > 7)) return null;

  // Expired/Suspended blocking modal
  if (showExpiredModal && (status.expired || status.suspended)) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md border border-gray-200 bg-white p-6 shadow-2xl mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center bg-rose-100 text-rose-600">
              <ShieldCheck size={24} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {status.suspended ? "Account Suspended" : "Plan Expired"}
              </h3>
              <p className="text-xs text-gray-500">
                {status.suspended
                  ? "Your workspace has been suspended by the administrator."
                  : "Your plan has expired. Please contact your administrator to renew."}
              </p>
            </div>
          </div>

          <div className="border border-rose-100 bg-rose-50 px-4 py-3 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Plan</span>
              <span className="font-bold text-gray-900 capitalize">{status.plan}</span>
            </div>
            {status.planExpiry && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-700">Expired on</span>
                <span className="font-bold text-rose-700">{status.planExpiry}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-600 mb-4">
            You can still view data in read-only mode, but creating or editing content is disabled until the plan is renewed.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setShowExpiredModal(false)}
              className="flex-1 h-9 border border-gray-200 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Continue (Read-only)
            </button>
            <a
              href="mailto:admin@akusaradigital.com?subject=Plan Renewal Request"
              className="flex-1 flex h-9 items-center justify-center bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              Contact Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Warning banner (< 7 days left)
  if (dismissed) return null;
  if (status.daysLeft === null || status.daysLeft > 7) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} weight="bold" className="text-amber-600" />
          <p className="text-xs font-semibold text-amber-800">
            {status.daysLeft <= 0
              ? "Your plan has expired. Some features may be restricted."
              : `Your plan expires in ${status.daysLeft} day${status.daysLeft !== 1 ? "s" : ""}. Contact your admin to renew.`}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex h-5 w-5 items-center justify-center text-amber-600 hover:text-amber-800"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    </div>
  );
}
