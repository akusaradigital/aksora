"use client";

import { useState, useEffect } from "react";
import {
  Compass, Play, Pause, CheckCircle, Plus, Bug, Timer, Globe, NotePencil,
  Clock, X, Check
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { QuickBugModal } from "@/components/bugs/quick-bug-modal";
import { ExploratoryCharterModal } from "./exploratory-charter-modal";

export type ExploratorySessionItem = {
  id: number;
  title: string;
  charter: string;
  project: string;
  environment: string;
  tester: string;
  targetDurationMinutes: number;
  actualDurationMinutes: number;
  status: "in_progress" | "completed" | "paused" | "aborted";
  notes?: string;
  bugsFound: number;
  startedAt: string;
  completedAt?: string;
};

export function ExploratorySessionView({
  initialSessions,
}: {
  initialSessions: ExploratorySessionItem[];
}) {
  const [sessions, setSessions] = useState<ExploratorySessionItem[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(
    () => initialSessions.find((s) => s.status === "in_progress")?.id || null
  );
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bugModalSession, setBugModalSession] = useState<ExploratorySessionItem | null>(null);

  // Note entry for active session
  const [currentNote, setCurrentNote] = useState("");

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Active Session Live Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "in_progress") return;
    const startMs = new Date(activeSession.startedAt).getTime();
    const tick = () => {
      const now = Date.now();
      setSecondsElapsed(Math.max(0, Math.floor((now - startMs) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const updateStatus = async (id: number, nextStatus: "in_progress" | "completed" | "paused") => {
    try {
      const res = await fetch(`/api/exploratory-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");

      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...json.data } : s))
      );
      toast(`Charter ${nextStatus.replace("_", " ")}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  const handleAddNote = async () => {
    if (!activeSession || !currentNote.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const stamped = `[${timeStr}] ${currentNote.trim()}`;
    const newNotes = activeSession.notes ? `${activeSession.notes}\n${stamped}` : stamped;

    try {
      const res = await fetch(`/api/exploratory-sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error("Failed to save observation");
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, notes: newNotes } : s))
      );
      setCurrentNote("");
      toast("Observation saved", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add note", "error");
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Bug Modal */}
      {bugModalSession && (
        <QuickBugModal
          isOpen={Boolean(bugModalSession)}
          onClose={() => setBugModalSession(null)}
          defaultProject={bugModalSession.project || ""}
          initialTitle={`[SBTM] Issue in ${bugModalSession.title}`}
          initialSteps={`Exploratory Charter: ${bugModalSession.charter}`}
          initialExpected="Feature operates reliably without anomalies"
          initialActual={`Session Notes:\n${bugModalSession.notes || "Defect uncovered during exploratory testing"}`}
        />
      )}

      {/* Create Charter Modal */}
      <ExploratoryCharterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(created) => {
          setSessions((prev) => [created, ...prev]);
          setActiveSessionId(created.id);
        }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Compass size={18} weight="bold" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Session-Based Exploratory Testing</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Charter-driven missions, live timeboxed observations & rapid 1-click bug reporting
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status filter */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setFilter("all")}
              className={cn("rounded-md px-2.5 py-1 transition", filter === "all" ? "bg-slate-900 text-white" : "text-slate-600")}
            >
              All
            </button>
            <button
              onClick={() => setFilter("in_progress")}
              className={cn("rounded-md px-2.5 py-1 transition", filter === "in_progress" ? "bg-blue-600 text-white" : "text-slate-600")}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={cn("rounded-md px-2.5 py-1 transition", filter === "completed" ? "bg-emerald-600 text-white" : "text-slate-600")}
            >
              Completed
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-98 transition"
          >
            <Plus size={14} weight="bold" /> New Charter
          </button>
        </div>
      </div>

      {/* Active Session Drawer */}
      {activeSession && activeSession.status === "in_progress" && (
        <div className="rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-blue-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Live Charter Mission</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {activeSession.environment}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{activeSession.title}</h2>
              <p className="text-xs text-slate-600 max-w-2xl">{activeSession.charter}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1 font-mono text-lg font-bold text-slate-900">
                  <Timer size={18} weight="bold" className="text-blue-600" />
                  {formatTimer(secondsElapsed)}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Timebox: {activeSession.targetDurationMinutes}m</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBugModalSession(activeSession)}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition"
                >
                  <Bug size={14} weight="bold" /> Log Bug
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(activeSession.id, "completed")}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                >
                  <Check size={14} weight="bold" /> Complete
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Notes & Observations */}
          <div className="mt-3.5 grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-8 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Record an observation, edge case, or test thought... (Press Enter)"
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNote())}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition"
                >
                  Record
                </button>
              </div>

              {activeSession.notes && (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 space-y-1 font-mono">
                  {activeSession.notes.split("\n").map((line, i) => (
                    <div key={i} className="text-[11px] leading-relaxed">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-4 flex flex-col justify-between rounded-lg border border-blue-100 bg-white p-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Charter Metrics</span>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">Bugs Found:</span>
                  <span className="font-bold text-rose-600">{activeSession.bugsFound}</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">Tester:</span>
                  <span className="font-semibold text-slate-800">{activeSession.tester || "You"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charter Sessions Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-200 transition"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    session.status === "in_progress"
                      ? "bg-blue-100 text-blue-800"
                      : session.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {session.status.replace("_", " ")}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {session.actualDurationMinutes || session.targetDurationMinutes} mins
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{session.title}</h3>
                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{session.charter}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                <span>{session.environment}</span>
                <span>•</span>
                <span>{session.bugsFound} bugs logged</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBugModalSession(session)}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Bug size={13} weight="bold" /> Log Bug
              </button>

              {session.status !== "in_progress" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(session.id);
                    updateStatus(session.id, "in_progress");
                  }}
                  className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-100"
                >
                  Resume
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
