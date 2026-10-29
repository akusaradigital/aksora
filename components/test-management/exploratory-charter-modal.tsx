"use client";

import { useState } from "react";
import { Compass, X } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import type { ExploratorySessionItem } from "./exploratory-session-view";

interface ExploratoryCharterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (session: ExploratorySessionItem) => void;
}

export function ExploratoryCharterModal({
  isOpen,
  onClose,
  onCreated,
}: ExploratoryCharterModalProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newCharter, setNewCharter] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newEnvironment, setNewEnvironment] = useState("staging");
  const [newDuration, setNewDuration] = useState(45);
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast("Charter title is required", "warning");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/exploratory-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          charter: newCharter,
          project: newProject,
          environment: newEnvironment,
          targetDurationMinutes: newDuration,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create charter");

      const created = json.data as ExploratorySessionItem;
      onCreated(created);
      onClose();
      setNewTitle("");
      setNewCharter("");
      toast("Charter started!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Creation failed", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Compass size={20} weight="bold" className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">New Exploratory Charter (SBTM)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Charter Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Payment Gateway Retry & Webhook Duplication"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Charter Objective & Mission
            </label>
            <textarea
              rows={3}
              placeholder="Explore [target/feature] with [resources/tools] to uncover [potential risks/bugs]..."
              value={newCharter}
              onChange={(e) => setNewCharter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Project
              </label>
              <input
                type="text"
                placeholder="Project name"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Environment
              </label>
              <select
                value={newEnvironment}
                onChange={(e) => setNewEnvironment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="staging">Staging</option>
                <option value="production">Production</option>
                <option value="dev">Dev</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Timebox
              </label>
              <select
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Launching..." : "Launch Charter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
