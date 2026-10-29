import React from "react";
import {
  Checks,
  Play,
  Bug,
  Kanban,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

export function QaWorkflowGraphic() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50">
      {/* Top Window Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[11px] font-mono text-slate-500">aksora.app/flow/pipeline</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle size={12} weight="bold" /> Continuous Flow
        </span>
      </div>

      {/* 4-Step Connected Quality Pipeline */}
      <div className="space-y-3">
        {/* Stage 1: Test Planning */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Checks size={18} weight="bold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">1. Structured Test Suites</p>
              <span className="text-[10px] font-mono text-blue-600">42 Cases</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">Preconditions, test steps &amp; expected criteria</p>
          </div>
        </div>

        {/* Pipeline Connector */}
        <div className="flex justify-center -my-1 text-slate-300">
          <ArrowRight size={14} weight="bold" className="rotate-90" />
        </div>

        {/* Stage 2: Live Execution */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Play size={18} weight="bold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">2. Live Execution Session</p>
              <span className="text-[10px] font-mono text-emerald-600">Pass Rate 94.8%</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">Step verdicts, timing &amp; failing attachments</p>
          </div>
        </div>

        {/* Pipeline Connector */}
        <div className="flex justify-center -my-1 text-slate-300">
          <ArrowRight size={14} weight="bold" className="rotate-90" />
        </div>

        {/* Stage 3: Bug Triage */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Bug size={18} weight="bold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">3. Direct Defect Filing</p>
              <span className="text-[10px] font-mono text-rose-600">Auto-Linked</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">Root cause, suggested dev &amp; sprint assignment</p>
          </div>
        </div>

        {/* Pipeline Connector */}
        <div className="flex justify-center -my-1 text-slate-300">
          <ArrowRight size={14} weight="bold" className="rotate-90" />
        </div>

        {/* Stage 4: Sprint & Release */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Kanban size={18} weight="bold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">4. Sprint Sync &amp; Release Ready</p>
              <span className="text-[10px] font-mono text-indigo-600">Auto Digest</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">Standup blockers cleared &amp; weekly QA summary</p>
          </div>
        </div>
      </div>

      {/* Security & Reliability Seal */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldCheck size={14} weight="bold" className="text-blue-600" />
          Isolated Workspace RBAC
        </span>
        <span className="flex items-center gap-1">
          <Clock size={13} weight="bold" /> Real-Time Sync
        </span>
      </div>
    </div>
  );
}
