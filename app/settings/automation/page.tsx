"use client";

import { useState, useEffect } from "react";
import { Lightning, Plus, Trash, CheckCircle } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";

interface Rule {
  id: number;
  name: string;
  module: string;
  triggerField: string;
  triggerValue: string;
  actionType: string;
  actionValue: string;
  active: number;
}

export default function AutomationSettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerField, setTriggerField] = useState("status");
  const [triggerValue, setTriggerValue] = useState("review");
  const [actionType, setActionType] = useState("assign");
  const [actionValue, setActionValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRules = async () => {
    try {
      const res = await fetch("/api/settings/automation");
      const data = await res.json();
      setRules(data.rules || []);
    } catch {
      toast("Failed to load automation rules", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !actionValue.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          module: "tasks",
          triggerField,
          triggerValue,
          actionType,
          actionValue: actionValue.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      toast("Automation rule created!", "success");
      setModalOpen(false);
      setName("");
      setActionValue("");
      loadRules();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error creating rule", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/automation?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast("Rule deleted", "success");
    } catch {
      toast("Failed to delete rule", "error");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lightning size={22} className="text-amber-500" weight="fill" />
            Rule-Based Automation
          </h1>
          <p className="text-xs text-slate-500">
            Automatically assign teammates or trigger webhooks when task statuses change.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus size={14} weight="bold" />
          <span>New Rule</span>
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Loading rules...</p>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Lightning size={32} className="mx-auto text-slate-300" />
          <p className="mt-2 text-xs font-medium text-slate-600">No automation rules configured yet.</p>
          <p className="text-[11px] text-slate-400">Create a rule to auto-assign tasks or notify endpoints on status transitions.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Rule Name</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-900">{rule.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    When <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{rule.triggerField}</span> = <span className="font-semibold text-indigo-600">{rule.triggerValue}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {rule.actionType === "assign" ? (
                      <span>Assign to <strong>{rule.actionValue}</strong></span>
                    ) : (
                      <span>Webhook → <span className="font-mono text-[11px] truncate max-w-[140px] inline-block align-bottom">{rule.actionValue}</span></span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Create Automation Rule</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Rule Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Auto-assign QA on Review"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">When field...</label>
                  <select
                    value={triggerField}
                    onChange={(e) => setTriggerField(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
                  >
                    <option value="status">status</option>
                    <option value="priority">priority</option>
                    <option value="category">category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">...equals</label>
                  <input
                    required
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    placeholder="e.g. review or P0"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
                >
                  <option value="assign">Auto-Assign to User / Email</option>
                  <option value="webhook">Send Outbound Webhook</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {actionType === "assign" ? "Assignee Email or Name" : "Webhook URL"}
                </label>
                <input
                  required
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder={actionType === "assign" ? "qa@company.com" : "https://api.example.com/webhook"}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
