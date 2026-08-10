"use client";

import Link from "next/link";
import {
  Bug,
  ArrowRight,
  TrendUp,
  TrendDown,
  Minus,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useValueChangeAnimation } from "@/hooks/use-value-change-animation";

export function StatCard({ label, value, icon, color, href }: {
  label: string; value: number; icon: React.ReactNode; color: string; href: string;
}) {
  const animClass = useValueChangeAnimation(value);
  return (
    <Link href={href} prefetch={false}
      className="flex items-center gap-4  border border-gray-200 bg-white p-5 transition hover:border-gray-300   group">
      <div className={cn("flex h-12 w-12 items-center justify-center ", color)}>
        {icon}
      </div>
      <div>
        <p className={cn("text-2xl font-bold tracking-tight text-gray-900", animClass)}>{value}</p>
        <p className="text-xs font-semibold text-gray-400">{label}</p>
      </div>
      <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-gray-500 transition" weight="bold" />
    </Link>
  );
}

export function BugStatCard({ value, bugSeverityCounts }: {
  value: number;
  bugSeverityCounts?: { critical: number; high: number; medium: number; low: number };
}) {
  const animClass = useValueChangeAnimation(value);
  return (
    <div className="flex flex-col  border border-gray-200 bg-white p-5 transition hover:border-gray-300   group">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center  bg-rose-50">
          <Bug size={20} weight="bold" className="text-rose-500" />
        </div>
        <div>
          <p className={cn("text-2xl font-bold tracking-tight text-gray-900", animClass)}>{value}</p>
          <p className="text-xs font-semibold text-gray-400">Open Bugs</p>
        </div>
        <Link href="/bugs" prefetch={false} className="ml-auto">
          <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition" weight="bold" />
        </Link>
      </div>
      {bugSeverityCounts && (
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3">
          {(["critical", "high", "medium", "low"] as const).map((severity) => (
            <Link
              key={severity}
              href={`/bugs?severity=${severity}`}
              prefetch={false}
              className="text-center hover:bg-gray-50  p-1.5 transition"
            >
              <p className="text-sm font-bold text-gray-700">{bugSeverityCounts[severity]}</p>
              <p className="text-[11px] font-semibold text-gray-400 capitalize">{severity}</p>
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
    <div className={cn(" px-4 py-3", bgColor)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-600">{label}</span>
        {prev > 0 && (
          <div className={cn("flex items-center gap-0.5 text-[11px] font-bold", delta > 0 ? "text-rose-500" : delta < 0 ? "text-emerald-500" : "text-gray-400")}>
            <TrendIcon size={10} weight="bold" />
            <span>{delta > 0 ? "+" : ""}{delta}%</span>
          </div>
        )}
      </div>
      <p className={cn("text-xl font-bold mt-1", color)}>{value}</p>
    </div>
  );
}

export function ResolutionRateMetric({ resolutionRate }: {
  resolutionRate?: { current: number | null; previousWeek: number | null; delta: number | null };
}) {
  if (!resolutionRate) return null;

  const { current, delta } = resolutionRate;
  const isNA = current === null;
  const rateColor = isNA ? "text-gray-400" : current < 70 ? "text-amber-500" : "text-emerald-500";
  const rateBgColor = isNA ? "bg-gray-50" : current < 70 ? "bg-amber-50" : "bg-emerald-50";

  return (
    <div className={cn(" px-4 py-3", rateBgColor)} data-testid="resolution-rate-metric">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-600">Resolution Rate</span>
        {delta !== null && (
          <span className={cn("text-[11px] font-bold", delta >= 0 ? "text-emerald-600" : "text-amber-600")} data-testid="resolution-rate-delta">
            {delta >= 0 ? `+${delta}` : `\u2212${Math.abs(delta)}`}pp
          </span>
        )}
      </div>
      <p className={cn("text-xl font-bold mt-1", rateColor)} data-testid="resolution-rate-value">
        {isNA ? "N/A" : `${current}%`}
      </p>
    </div>
  );
}

export function QuickBtn({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex h-9 items-center gap-1.5  border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900">
      {icon}{label}
    </Link>
  );
}
