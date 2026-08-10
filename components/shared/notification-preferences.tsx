"use client";

import { useEffect, useState } from "react";
import { Bell, BellRinging, BellSlash, CheckCircle, EnvelopeSimple, Lightning, UserCircle, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Preferences = {
  assignedToMe: boolean;
  statusChanges: boolean;
  mentions: boolean;
  overdueBugs: boolean;
  sprintDeadlines: boolean;
  dailyDigest: boolean;
};

const DEFAULT_PREFS: Preferences = {
  assignedToMe: true,
  statusChanges: true,
  mentions: true,
  overdueBugs: true,
  sprintDeadlines: true,
  dailyDigest: true,
};

type PrefItem = {
  key: keyof Preferences;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "realtime" | "digest";
};

const prefItems: PrefItem[] = [
  {
    key: "assignedToMe",
    label: "Assigned to me",
    description: "When a bug, task, or test case is assigned to you",
    icon: <UserCircle size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "statusChanges",
    label: "Status changes",
    description: "When items you created or are assigned to change status",
    icon: <Lightning size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "mentions",
    label: "Mentions",
    description: "When someone mentions you in a comment or description",
    icon: <BellRinging size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "overdueBugs",
    label: "Overdue bugs",
    description: "When bugs remain open past their expected resolution time",
    icon: <WarningCircle size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "sprintDeadlines",
    label: "Sprint & plan deadlines",
    description: "When sprints or test plans are approaching their end date",
    icon: <Bell size={16} weight="bold" />,
    category: "realtime",
  },
  {
    key: "dailyDigest",
    label: "Daily digest",
    description: "Morning summary of new bugs, assignments, and upcoming deadlines",
    icon: <EnvelopeSimple size={16} weight="bold" />,
    category: "digest",
  },
];

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/notification-preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function togglePref(key: keyof Preferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error();
      toast("Preferences saved", "success");
      setDirty(false);
    } catch {
      toast("Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  }

  function enableAll() {
    setPrefs({
      assignedToMe: true,
      statusChanges: true,
      mentions: true,
      overdueBugs: true,
      sprintDeadlines: true,
      dailyDigest: true,
    });
    setDirty(true);
  }

  function disableAll() {
    setPrefs({
      assignedToMe: false,
      statusChanges: false,
      mentions: false,
      overdueBugs: false,
      sprintDeadlines: false,
      dailyDigest: false,
    });
    setDirty(true);
  }

  const realtimeItems = prefItems.filter((item) => item.category === "realtime");
  const digestItems = prefItems.filter((item) => item.category === "digest");
  const enabledCount = Object.values(prefs).filter(Boolean).length;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-gray-50 border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">
            {enabledCount} of {prefItems.length} enabled
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={enableAll}
            className="h-7 border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Enable all
          </button>
          <button
            type="button"
            onClick={disableAll}
            className="h-7 border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Disable all
          </button>
        </div>
      </div>

      {/* Realtime notifications */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">In-App Notifications</h3>
        <div className="space-y-1">
          {realtimeItems.map((item) => (
            <PrefToggle
              key={item.key}
              item={item}
              enabled={prefs[item.key]}
              onToggle={() => togglePref(item.key)}
            />
          ))}
        </div>
      </div>

      {/* Digest */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Daily Summary</h3>
        <div className="space-y-1">
          {digestItems.map((item) => (
            <PrefToggle
              key={item.key}
              item={item}
              enabled={prefs[item.key]}
              onToggle={() => togglePref(item.key)}
            />
          ))}
        </div>
      </div>

      {/* Save button */}
      {dirty && (
        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            <CheckCircle size={14} weight="bold" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          <span className="text-[11px] text-gray-400">Unsaved changes</span>
        </div>
      )}
    </div>
  );
}

function PrefToggle({ item, enabled, onToggle }: { item: PrefItem; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 border px-4 py-3 text-left transition",
        enabled
          ? "border-blue-100 bg-blue-50/30 hover:bg-blue-50"
          : "border-gray-100 bg-white hover:bg-gray-50",
      )}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center",
        enabled ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400",
      )}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", enabled ? "text-gray-900" : "text-gray-500")}>
          {item.label}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">{item.description}</p>
      </div>
      <div className={cn(
        "flex h-6 w-10 shrink-0 items-center border px-0.5 transition-colors",
        enabled ? "border-blue-300 bg-blue-600" : "border-gray-300 bg-gray-200",
      )}>
        <div className={cn(
          "h-4 w-4 bg-white shadow-sm transition-transform",
          enabled ? "translate-x-4" : "translate-x-0",
        )} />
      </div>
    </button>
  );
}
