"use client";

import { CheckCircle, ArrowSquareOut, CaretDown, CaretUp, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { cn, formatDuration } from "@/lib/utils";

export interface SicmundusTaskProp {
  id: string | number;
  title: string;
  description?: string;
  project?: string;
  category?: string;
  durationMinutes?: number | string;
  startDate?: string;
  endDate?: string;
}

export function SicmundusSyncHeader({
  onClose,
  isSyncing,
}: {
  onClose: () => void;
  isSyncing: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200/80 px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center bg-sky-600 text-white">
          <PaperPlaneTilt size={16} weight="bold" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Sync to Sicmundus</h2>
          <p className="text-[11px] text-gray-500">Log daily subtask and time entry to Sicmundus</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={isSyncing}
        className="p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        aria-label="Close"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}

export interface SicmundusSyncResult {
  subtaskId: string;
  entryId: string;
  title: string;
}

export interface SicmundusParentTask {
  id: string;
  title: string;
  category?: string;
  project_name?: string | null;
}

export const DEFAULT_PRESET_TASKS: SicmundusParentTask[] = [
  { id: "48eaa317-0f7c-4152-ada5-e0c8b4eb88ac", title: "Testing QA Studio & Evidence Hub", category: "Testing", project_name: "QA Ecosystem" },
  { id: "48672c2b-bb66-4f67-b6a9-f320246404ba", title: "Campaign RTD Top Spender", category: "Development", project_name: "RTD Top Spender" },
  { id: "8a6c7128-d8a1-457e-801b-96527bedd949", title: "Create K6 Performance Test", category: "Research & Development", project_name: "R&D" },
  { id: "a889e502-aa7d-4cae-8a46-cec1fb05f3f0", title: "Laravel Testing Environment (TST/UAT/PRD)", category: "Testing", project_name: "Core Platform" },
];

export const DURATION_PRESETS = [
  { label: "30m", minutes: 30 },
  { label: "60m / 1h", minutes: 60 },
  { label: "120m / 2h", minutes: 120 },
  { label: "240m / 4h", minutes: 240 },
  { label: "480m / 8h", minutes: 480 },
];

export function DurationPresetChips({
  currentMinutes,
  onSelect,
}: {
  currentMinutes: number;
  onSelect: (minutes: number) => void;
}) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Quick Presets</span>
      <div className="flex flex-wrap gap-1.5">
        {DURATION_PRESETS.map((preset) => {
          const active = currentMinutes === preset.minutes;
          return (
            <button
              key={preset.minutes}
              type="button"
              onClick={() => onSelect(preset.minutes)}
              className={cn(
                "px-2 py-0.5 text-[11px] font-semibold transition border",
                active
                  ? "border-sky-600 bg-sky-50 text-sky-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SicmundusTaskPreview({ task }: { task: SicmundusTaskProp }) {
  return (
    <div className="border border-gray-200/80 bg-gray-50/70 p-3 text-xs space-y-1">
      <div className="flex items-center justify-between text-gray-500 text-[11px]">
        <span className="font-bold uppercase tracking-wider text-gray-400">Aksora Source Task</span>
        <span className="font-semibold text-gray-600">{task.category || "Task"}</span>
      </div>
      <p className="font-bold text-gray-900 text-sm truncate">{task.title}</p>
      {task.project && (
        <p className="text-gray-500 text-[11px]">
          Project: <span className="font-semibold text-gray-700">{task.project}</span>
        </p>
      )}
    </div>
  );
}

export function SicmundusSyncSuccess({
  data,
  onClose,
}: {
  data: { title: string; subtaskId: string; durationMinutes: number; sicmundusUrl: string };
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2.5 border border-emerald-200 bg-emerald-50/80 p-3 text-emerald-800">
        <CheckCircle size={22} weight="bold" className="text-emerald-600 shrink-0" />
        <div>
          <h3 className="text-xs font-bold text-emerald-950">Successfully Synced!</h3>
          <p className="text-[11px] text-emerald-700">Subtask and time entry have been recorded in Sicmundus.</p>
        </div>
      </div>

      <div className="border border-gray-200 bg-gray-50/70 p-3 space-y-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Subtask Title</div>
          <div className="text-xs font-semibold text-gray-900 mt-0.5">{data.title}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Subtask ID</div>
            <code className="text-[11px] font-mono text-gray-700 truncate block mt-0.5">{data.subtaskId || "-"}</code>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Duration Logged</div>
            <div className="text-xs font-semibold text-gray-900 mt-0.5">
              {data.durationMinutes} menit ({formatDuration(data.durationMinutes)})
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <a
          href={data.sicmundusUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 bg-sky-600 px-3.5 text-xs font-bold text-white transition hover:bg-sky-500"
        >
          <ArrowSquareOut size={13} weight="bold" />
          View in Sicmundus
        </a>
        <button
          type="button"
          onClick={onClose}
          className="h-8 border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function SicmundusCredentialsFields({
  show,
  onToggle,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
}: {
  show: boolean;
  onToggle: () => void;
  username: string;
  onUsernameChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
}) {
  return (
    <div className="border border-gray-200 bg-gray-50/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold text-gray-600 transition hover:bg-gray-100/70"
      >
        <span>Sicmundus Credentials (Optional override)</span>
        {show ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
      </button>
      {show && (
        <div className="p-3 border-t border-gray-200 space-y-2.5">
          <p className="text-[11px] text-gray-500">
            If left blank, default credentials configured in server environment will be used.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                placeholder="username"
                className="w-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="password"
                className="w-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
