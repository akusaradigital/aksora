"use client";

import { cn } from "@/lib/utils";
import { ShuffleAngular } from "@phosphor-icons/react";

type HistoryEntry = {
  verdict: string;
  executedAt: string;
  runNumber: number;
};

export function VerdictDot({ verdict }: { verdict: string }) {
  const color = verdict === "Passed"
    ? "bg-emerald-500"
    : verdict === "Failed"
    ? "bg-rose-500"
    : verdict === "Blocked"
    ? "bg-amber-500"
    : "bg-gray-300";

  return (
    <div
      className={cn("h-4 w-4 rounded-sm", color)}
      title={verdict}
    />
  );
}

export function VerdictTimeline({ history }: { history: HistoryEntry[] }) {
  if (!history || history.length === 0) {
    return <span className="text-[10px] text-gray-400">No history</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {history.slice(-15).map((entry, i) => (
        <VerdictDot key={i} verdict={entry.verdict} />
      ))}
    </div>
  );
}

export function FlakinessGauge({ rate }: { rate: number }) {
  const color = rate >= 60
    ? "text-rose-600 bg-rose-50 border-rose-100"
    : rate >= 40
    ? "text-orange-600 bg-orange-50 border-orange-100"
    : "text-amber-600 bg-amber-50 border-amber-100";

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border rounded-sm", color)}>
      <ShuffleAngular size={12} weight="bold" />
      {rate}%
    </span>
  );
}
