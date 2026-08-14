"use client";

import { useEffect, useState } from "react";
import { Buildings, Users, ShieldCheck, WarningCircle, Info, CalendarBlank } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";

type WorkspaceData = {
  companyName: string;
  plan: string;
  planExpiry?: string | null;
  maxUsers: number;
  currentUsers: number;
  status: string;
  createdAt?: string | null;
};

export function WorkspaceClient() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/settings/workspace");
        if (!res.ok) {
          throw new Error("Failed to load workspace data.");
        }
        const json = await res.json();
        if (!active) return;
        setData(json.data || null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to fetch workspace information");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "No expiry";
    try {
      return new Date(isoString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const capitalizePlan = (planName: string) => {
    if (!planName) return "Unknown Plan";
    return planName.charAt(0).toUpperCase() + planName.slice(1) + " Plan";
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="h-32 animate-pulse bg-slate-100 border border-slate-200" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-48 animate-pulse bg-slate-100 border border-slate-200" />
          <div className="h-48 animate-pulse bg-slate-100 border border-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return <InlineAlert variant="error" message={error} />;
  }

  if (!data || !data.companyName) {
    return (
      <div className="flex flex-col items-center justify-center border border-slate-200 bg-white px-6 py-16 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
          <Buildings size={32} weight="bold" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Workspace Assigned</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-sm text-center leading-relaxed">
          You are not currently associated with a specific workspace or company. Workspace and plan features are unavailable.
        </p>
      </div>
    );
  }

  const isSuspended = data.status.toLowerCase() === "suspended";
  const pctRaw = data.maxUsers > 0 ? (data.currentUsers / data.maxUsers) * 100 : 0;
  const pct = Math.min(100, Math.round(pctRaw));
  
  let progressColor = "bg-blue-600";
  let alertVariant: "info" | "warning" | "error" | null = null;
  let alertMessage = "";

  if (pct >= 100) {
    progressColor = "bg-rose-600";
    alertVariant = "error";
    alertMessage = "User limit reached. Contact your administrator to add more seats.";
  } else if (pct >= 80) {
    progressColor = "bg-amber-500";
    alertVariant = "warning";
    alertMessage = "Approaching user limit for this workspace plan.";
  }

  return (
    <div className="w-full space-y-6">
      {/* Workspace Header Card */}
      <div className="flex flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-blue-50 text-blue-600">
            <Buildings size={24} weight="bold" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">{data.companyName}</h2>
            <div className="mt-2 flex items-center gap-3">
              {isSuspended ? (
                <span className="inline-flex items-center gap-1 border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  <WarningCircle size={12} weight="bold" /> Suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <ShieldCheck size={12} weight="bold" /> Active
                </span>
              )}
              {data.createdAt && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <CalendarBlank size={12} />
                  Created {formatDate(data.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSuspended && (
        <InlineAlert
          variant="error"
          title="Workspace Suspended"
          message="This workspace is currently suspended. Please contact platform administrators for assistance."
        />
      )}

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Plan Info Card */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Subscription Plan</h3>
            <ShieldCheck size={18} className="text-slate-400" />
          </div>
          
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Current Plan</p>
            <p className="text-xl font-black text-slate-800">{capitalizePlan(data.plan)}</p>
          </div>

          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Renewal / Expiry Date</p>
            <p className="text-sm font-semibold text-slate-700">{formatDate(data.planExpiry)}</p>
          </div>

          <div className="mt-8 flex items-start gap-2 bg-slate-50 p-3 border border-slate-100">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Plan changes and billing management are handled centrally. Contact your administrator to change your plan or update billing details.
            </p>
          </div>
        </div>

        {/* User Limits Card */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">User Usage & Limits</h3>
            <Users size={18} className="text-slate-400" />
          </div>

          <div className="mb-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Seats Used</p>
                <p className="text-xl font-black text-slate-800">
                  {data.currentUsers} <span className="text-sm font-medium text-slate-400">/ {data.maxUsers} users</span>
                </p>
              </div>
              <p className="text-xs font-bold text-slate-500">{pct}%</p>
            </div>
            <div className="h-2.5 w-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {alertVariant && alertMessage && (
            <div className="mb-6">
              <InlineAlert variant={alertVariant} message={alertMessage} compact />
            </div>
          )}

          <div className="mt-8 flex items-start gap-2 bg-slate-50 p-3 border border-slate-100">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Maximum users depend on the active plan tier. Removing an inactive user frees up a seat immediately.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
