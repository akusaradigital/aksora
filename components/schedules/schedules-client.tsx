"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock, Moon, Plus, RocketLaunch, Trash } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ScheduleForm, PRESET_LABELS, type Preset } from "./schedule-form";

type Suite = { id: number; title: string };
type Schedule = {
  id: number;
  name: string;
  preset: Preset;
  hour: number;
  weekdaysOnly: boolean;
  active: boolean;
  suiteTitle: string | null;
  environmentName: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  timezone: string;
};

const QUICK_PRESETS: { preset: Preset; icon: typeof Moon; text: string }[] = [
  { preset: "nightly", icon: Moon, text: "Every day at 00:00." },
  { preset: "hourly", icon: Clock, text: "Every hour from 09:00 to 17:00, Monday to Friday." },
  { preset: "prerelease", icon: RocketLaunch, text: "06:00 on weekdays, before the team starts." },
];

function formatTime(iso: string | null, timezone: string) {
  if (!iso) return "Not scheduled";
  try {
    return new Date(iso).toLocaleString("en-GB", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function describe(s: Schedule) {
  if (s.preset !== "custom") return PRESET_LABELS[s.preset];
  return `${String(s.hour).padStart(2, "0")}:00 ${s.weekdaysOnly ? "on weekdays" : "every day"}`;
}

export function SchedulesClient({ suites }: { suites: Suite[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formPreset, setFormPreset] = useState<Preset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/run-schedules");
      if (!res.ok) throw new Error("Failed to load schedules.");
      setItems((await res.json()).data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (s: Schedule) => {
    const res = await fetch(`/api/run-schedules/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    if (!res.ok) return toast((await res.json().catch(() => ({}))).error || "Failed to update schedule", "error");
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/run-schedules/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    if (!res.ok) return toast((await res.json().catch(() => ({}))).error || "Failed to delete schedule", "error");
    toast("Schedule deleted", "success");
    await load();
  };

  const onSaved = async () => {
    setFormPreset(null);
    await load();
    router.refresh();
  };

  return (
    <div className="w-full space-y-8">
      {error && <InlineAlert variant="error" message={error} />}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 animate-pulse bg-slate-100" />)}</div>
      ) : items.length === 0 ? (
        <div className="space-y-4">
          <div className="border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">No schedules yet</h2>
            <p className="mt-1 text-xs text-slate-500">Pick a starting point. You choose the suite and environment next.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {QUICK_PRESETS.map(({ preset, icon: Icon, text }) => (
              <button
                key={preset}
                onClick={() => setFormPreset(preset)}
                className="flex flex-col items-start gap-2 border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <Icon size={22} weight="bold" className="text-blue-600" />
                <span className="text-sm font-bold text-slate-900">{PRESET_LABELS[preset]}</span>
                <span className="text-xs text-slate-500">{text}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setFormPreset("custom")} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
            Or set a custom hour
          </button>
        </div>
      ) : (
        <div className="border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Schedules</h3>
            <button
              onClick={() => setFormPreset("nightly")}
              className="inline-flex h-9 items-center gap-1.5 bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={15} weight="bold" /> New Schedule
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Suite</th>
                  <th className="px-6 py-3">When</th>
                  <th className="px-6 py-3">Next run</th>
                  <th className="px-6 py-3">Last run</th>
                  <th className="px-6 py-3">Active</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((s) => (
                  <tr key={s.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {s.name}
                      {s.environmentName && <span className="ml-2 text-[11px] font-normal text-slate-500">on {s.environmentName}</span>}
                    </td>
                    <td className="px-6 py-4">{s.suiteTitle || "Deleted suite"}</td>
                    <td className="px-6 py-4">{describe(s)}</td>
                    <td className="px-6 py-4">{s.active ? formatTime(s.nextRunAt, s.timezone) : "Paused"}</td>
                    <td className="px-6 py-4 text-slate-500">{s.lastRunAt ? formatTime(s.lastRunAt, s.timezone) : "Never"}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={s.active}
                        aria-label={`${s.active ? "Pause" : "Resume"} ${s.name}`}
                        onClick={() => toggle(s)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${s.active ? "bg-blue-600" : "bg-slate-300"}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${s.active ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDeleteTarget(s)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800">
                        <Trash size={14} weight="bold" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-center gap-1.5 border-t border-slate-100 px-6 py-3 text-[11px] text-slate-500">
            <CalendarCheck size={13} weight="bold" /> Times use the workspace time zone ({items[0]?.timezone}).
          </p>
        </div>
      )}

      {formPreset && (
        <ScheduleForm initialPreset={formPreset} suites={suites} onClose={() => setFormPreset(null)} onSaved={onSaved} />
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Schedule"
        message={`Delete "${deleteTarget?.name}"? Past runs stay in the suite history.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
