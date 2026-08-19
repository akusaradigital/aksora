"use client";

import Link from "next/link";
import {
  TrendUp,
  TrendDown,
  Minus,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useValueChangeAnimation } from "@/hooks/use-value-change-animation";

export function StatCard({ label, value, icon, color, href }: {
  label: string; value: number; icon: React.ReactNode; color: string; href: string;
}) {
  const animClass = useValueChangeAnimation(value);
  return (
    <Link href={href} prefetch={false}
      className="flex flex-col gap-3 border border-slate-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md group">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-sm", color)}>
          {icon}
        </div>
      </div>
      <p className={cn("text-5xl font-black tracking-tighter text-slate-900", animClass)}>{value}</p>
    </Link>
  );
}

export function BugStatCard({ value, bugSeverityCounts }: {
  value: number;
  bugSeverityCounts?: { critical: number; high: number; medium: number; low: number };
}) {
  const animClass = useValueChangeAnimation(value);
  return (
    <div className="flex flex-col border border-slate-200 border-l-4 border-l-rose-500 bg-white p-6 transition-all hover:shadow-md group relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Open Bugs</p>
        <Link href="/bugs" prefetch={false} aria-label="View all bugs">
          <ArrowRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" weight="bold" />
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <p className={cn("text-5xl font-black tracking-tighter text-slate-900", animClass)}>{value}</p>
      </div>
      {bugSeverityCounts && (
        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4">
          {(["critical", "high", "medium", "low"] as const).map((severity) => (
            <Link
              key={severity}
              href={`/bugs?severity=${severity}`}
              prefetch={false}
              className="text-center group/sev transition-transform hover:-translate-y-0.5"
            >
              <p className="text-lg font-black text-slate-800 group-hover/sev:text-rose-600 transition-colors">{bugSeverityCounts[severity]}</p>
              <p className="text-[10px] font-bold text-slate-400 capitalize uppercase tracking-widest">{severity}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PulseMetric({ label, value, prev, color, bgColor }: {
  label: string; value: number; prev: number; color: string; bgColor: string;
}) {
  const delta = prev > 0 ? Math.round(((value - prev) / prev) * 100) : 0;
  const TrendIcon = delta > 0 ? TrendUp : delta < 0 ? TrendDown : Minus;

  return (
    <div className={cn("p-4 border border-slate-100", bgColor)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
        {prev > 0 && (
          <div className={cn("flex items-center gap-0.5 text-xs font-black", delta > 0 ? "text-rose-600" : delta < 0 ? "text-emerald-600" : "text-slate-400")}>
            <TrendIcon size={12} weight="bold" />
            <span>{delta > 0 ? "+" : ""}{delta}%</span>
          </div>
        )}
      </div>
      <p className={cn("text-3xl font-black tracking-tight mt-2", color)}>{value}</p>
    </div>
  );
}

export function ResolutionRateMetric({ resolutionRate }: {
  resolutionRate?: { current: number | null; previousWeek: number | null; delta: number | null };
}) {
  if (!resolutionRate) return null;

  const { current, delta } = resolutionRate;
  const isNA = current === null;
  const rateColor = isNA ? "text-slate-400" : current < 70 ? "text-amber-600" : "text-emerald-600";
  const rateBgColor = isNA ? "bg-slate-50" : current < 70 ? "bg-amber-50/60" : "bg-emerald-50/60";

  return (
    <div className={cn("p-4 border border-slate-100", rateBgColor)} data-testid="resolution-rate-metric">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Resolution Rate</span>
        {delta !== null && (
          <span className={cn("text-xs font-black", delta >= 0 ? "text-emerald-600" : "text-amber-600")} data-testid="resolution-rate-delta">
            {delta >= 0 ? `+${delta}` : `\u2212${Math.abs(delta)}`}pp
          </span>
        )}
      </div>
      <p className={cn("text-3xl font-black tracking-tight mt-2", rateColor)} data-testid="resolution-rate-value">
        {isNA ? "N/A" : `${current}%`}
      </p>
    </div>
  );
}

export function QuickBtn({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600">
      {icon}{label}
    </Link>
  );
}
