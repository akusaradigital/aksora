"use client";

import { Warning } from "@phosphor-icons/react";

export interface DuplicateBugItem {
  id: number;
  title: string;
  similarityScore: number;
  matchReason: string;
}

export type DuplicateItem = DuplicateBugItem;

export function DuplicateBugsBanner({ duplicates }: { duplicates: DuplicateItem[] }) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
        <Warning size={15} weight="bold" className="text-amber-600" />
        Possible Duplicate Bugs Detected ({duplicates.length})
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {duplicates.map((d) => (
          <div
            key={d.id}
            className="flex items-start justify-between gap-2 text-[11px] bg-white/90 p-2 rounded border border-amber-200"
          >
            <div>
              <span className="font-bold text-slate-900">
                #{d.id}: {d.title}
              </span>
              <p className="text-slate-600 mt-0.5">{d.matchReason}</p>
            </div>
            <span className="shrink-0 font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
              {d.similarityScore}% match
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
