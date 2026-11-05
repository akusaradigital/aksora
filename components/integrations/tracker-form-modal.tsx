"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineAlert } from "@/components/ui/inline-alert";

export type TrackerKind = "jira" | "trello" | "lark";

export type IssueTrackerItem = {
  id: number;
  kind: TrackerKind;
  name: string;
  config: Record<string, string>;
  enabled: boolean;
  hasSecret: boolean;
};

const KIND_FIELDS: Record<TrackerKind, { key: string; label: string; placeholder: string }[]> = {
  jira: [
    { key: "host", label: "Jira site", placeholder: "your-team.atlassian.net" },
    { key: "email", label: "Account email", placeholder: "you@company.com" },
    { key: "projectKey", label: "Project key", placeholder: "QA" },
    { key: "issueType", label: "Issue type", placeholder: "Bug" },
  ],
  trello: [
    { key: "boardId", label: "Board ID", placeholder: "From the board URL" },
    { key: "listId", label: "List ID", placeholder: "List where cards are created" },
    { key: "apiKey", label: "API key", placeholder: "From trello.com/power-ups/admin" },
  ],
  lark: [
    { key: "appId", label: "App ID", placeholder: "cli_xxxxxxxx" },
    { key: "baseToken", label: "Base app token", placeholder: "From the Base URL" },
    { key: "tableId", label: "Table ID", placeholder: "tblxxxxxxxx" },
  ],
};

const SECRET_LABEL: Record<TrackerKind, string> = {
  jira: "API token",
  trello: "API token",
  lark: "App secret",
};

export const KIND_LABEL: Record<TrackerKind, string> = { jira: "Jira", trello: "Trello", lark: "Lark Base" };

const inputClass =
  "w-full h-9 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1";

export function TrackerFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: IssueTrackerItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<TrackerKind>(initial?.kind ?? "jira");
  const [name, setName] = useState(initial?.name ?? "");
  const [config, setConfig] = useState<Record<string, string>>(initial?.config ?? { issueType: "Bug" });
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = initial
        ? { name, config, ...(secret.trim() ? { secret } : {}) }
        : { kind, name, config, secret };
      const res = await fetch(initial ? `/api/issue-trackers/${initial.id}` : "/api/issue-trackers", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save tracker.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tracker.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isOpen onClose={onClose} title={initial ? "Edit tracker" : "Add tracker"} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <InlineAlert variant="error" message={error} />}

        {!initial && (
          <div>
            <span className={labelClass}>Tracker</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(KIND_LABEL) as TrackerKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setConfig(k === "jira" ? { issueType: "Bug" } : {});
                  }}
                  className={`h-9 border text-xs font-bold transition ${kind === k ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="tracker-name" className={labelClass}>Name</label>
          <input id="tracker-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={`${KIND_LABEL[kind]} - Mobile team`} className={inputClass} />
        </div>

        {KIND_FIELDS[kind].map((field) => (
          <div key={field.key}>
            <label htmlFor={`tracker-${field.key}`} className={labelClass}>{field.label}</label>
            <input
              id={`tracker-${field.key}`}
              required
              value={config[field.key] ?? ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className={inputClass}
            />
          </div>
        ))}

        <div>
          <label htmlFor="tracker-secret" className={labelClass}>{SECRET_LABEL[kind]}</label>
          <input
            id="tracker-secret"
            type="password"
            autoComplete="off"
            required={!initial}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={initial ? "Leave empty to keep the saved token" : ""}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-slate-500">Stored encrypted. It is never shown again after saving.</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Save changes" : "Add tracker"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
