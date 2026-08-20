"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TIMEZONES = [
  "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura",
  "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Bangkok",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Kolkata",
  "UTC", "Europe/London", "Europe/Paris",
  "America/New_York", "America/Los_Angeles",
];

export function WorkspaceBrandingForm({
  workspaceId,
  initialTimezone,
  initialSprintFormat,
}: {
  workspaceId: number;
  initialTimezone: string;
  initialSprintFormat: string;
}) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(initialTimezone || "Asia/Jakarta");
  const [sprintFormat, setSprintFormat] = useState(initialSprintFormat || "Sprint {N}");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, sprintFormat }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || "Failed to save.");
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-200 p-4 space-y-4">
      <p className="text-sm font-bold text-gray-900">Workspace Preferences</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => { setTimezone(e.target.value); setSaved(false); }}
            className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint name format</label>
          <input
            type="text"
            value={sprintFormat}
            onChange={(e) => { setSprintFormat(e.target.value); setSaved(false); }}
            placeholder="Sprint {N}"
            className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400"
          />
          <p className="mt-1 text-[11px] text-gray-400">Use <code>{"{N}"}</code> as sprint number placeholder.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save preferences"}
        </button>
        {saved && <span className="text-xs font-semibold text-emerald-700">Saved.</span>}
        {error && <span className="text-xs font-semibold text-rose-700">{error}</span>}
      </div>
    </div>
  );
}
