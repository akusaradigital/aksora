"use client";

import { useState } from "react";
import { FormDrawer } from "@/components/shared/form-drawer";
import { InlineAlert } from "@/components/ui/inline-alert";
import { toast } from "@/components/ui/toast";
import { EnvironmentSelect } from "@/components/environments/environment-select";

export type Preset = "nightly" | "hourly" | "prerelease" | "custom";

export const PRESET_LABELS: Record<Preset, string> = {
  nightly: "Nightly",
  hourly: "Hourly (work hours)",
  prerelease: "Pre-release check",
  custom: "Custom",
};

const inputCls =
  "w-full h-9 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1";

export function ScheduleForm({
  initialPreset,
  suites,
  onClose,
  onSaved,
}: {
  initialPreset: Preset;
  suites: { id: number; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [name, setName] = useState(initialPreset === "custom" ? "" : PRESET_LABELS[initialPreset]);
  const [testSuiteId, setTestSuiteId] = useState(suites[0] ? String(suites[0].id) : "");
  const [environmentId, setEnvironmentId] = useState("");
  const [hour, setHour] = useState(9);
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/run-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          testSuiteId: Number(testSuiteId),
          environmentId: environmentId ? Number(environmentId) : null,
          preset,
          ...(preset === "custom" ? { hour, weekdaysOnly } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create schedule.");
      toast("Schedule created", "success");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer open title="New Schedule" subtitle="Each run is queued for the AI runner." onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4 p-5">
        {error && <InlineAlert variant="error" message={error} />}
        {suites.length === 0 && <InlineAlert variant="warning" message="Create a test suite first. Schedules run one suite each." />}
        <div>
          <label htmlFor="sch-name" className={labelCls}>Name</label>
          <input id="sch-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly checkout regression" className={inputCls} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sch-suite" className={labelCls}>Test suite</label>
            <select id="sch-suite" required value={testSuiteId} onChange={(e) => setTestSuiteId(e.target.value)} className={inputCls}>
              {suites.map((s) => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sch-env" className={labelCls}>Environment</label>
            <EnvironmentSelect id="sch-env" value={environmentId} onChange={setEnvironmentId} className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="sch-preset" className={labelCls}>When</label>
          <select id="sch-preset" value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className={inputCls}>
            <option value="nightly">Nightly: every day at 00:00</option>
            <option value="hourly">Hourly: 09:00 to 17:00, Mon to Fri</option>
            <option value="prerelease">Pre-release: 06:00 on weekdays</option>
            <option value="custom">Custom hour</option>
          </select>
        </div>
        {preset === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sch-hour" className={labelCls}>Hour</label>
              <select id="sch-hour" value={hour} onChange={(e) => setHour(Number(e.target.value))} className={inputCls}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-800">
              <input type="checkbox" checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Weekdays only
            </label>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="h-9 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving || !name.trim() || !testSuiteId} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Creating..." : "Create Schedule"}
          </button>
        </div>
      </form>
    </FormDrawer>
  );
}
