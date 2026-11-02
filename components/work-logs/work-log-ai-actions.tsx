"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle,
  ClipboardText,
  ArrowsClockwise,
  Plus,
  Bug,
  Flask,
  ChatCenteredText,
  Clock,
  Check,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface BugActivity {
  id: number | string;
  title: string;
  project: string;
  severity: string;
  status: string;
}

interface TestSessionActivity {
  id: number | string;
  project: string;
  tester: string;
  scope: string;
  totalCases: string;
  passed: string;
  failed: string;
  result: string;
}

interface StandupNoteActivity {
  id: number | string;
  title: string;
  project: string;
  content: string;
  actionItems: string;
}

interface WorkLogSuggestion {
  date: string;
  project: string;
  category: string;
  description: string;
  output: string;
  durationMinutes: number;
}

interface TodayWorkLog {
  id: number | string;
  project: string;
  category: string;
  description: string;
  output: string;
  durationMinutes: number | string;
}

function formatDurationLabel(mins: number | string | undefined | null): string {
  const num = typeof mins === "number" ? mins : parseInt(String(mins || "").replace(/\D+/g, ""), 10);
  if (!num || isNaN(num) || num <= 0) return "1h";
  const h = Math.floor(num / 60);
  const m = num % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDateLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function WorkLogAiActions() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [copying, setCopying] = useState(false);

  const [bugs, setBugs] = useState<BugActivity[]>([]);
  const [testSessions, setTestSessions] = useState<TestSessionActivity[]>([]);
  const [standupNotes, setStandupNotes] = useState<StandupNoteActivity[]>([]);
  const [suggestions, setSuggestions] = useState<WorkLogSuggestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // 1. Pull Today's Work
  const handleOpenPullModal = async () => {
    setIsOpen(true);
    setLoadingActivity(true);
    try {
      const res = await fetch("/api/work-logs/today-activity");
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to load today's QA activities");
      }

      const activities = json.data?.activities || {};
      const fetchedBugs: BugActivity[] = activities.bugs || [];
      const fetchedSessions: TestSessionActivity[] = activities.testSessions || [];
      const fetchedNotes: StandupNoteActivity[] = activities.standupNotes || [];
      const fetchedSuggestions: WorkLogSuggestion[] = json.data?.suggestions || [];

      setBugs(fetchedBugs);
      setTestSessions(fetchedSessions);
      setStandupNotes(fetchedNotes);
      setSuggestions(fetchedSuggestions);
      setSelectedIndices(new Set(fetchedSuggestions.map((_, idx) => idx)));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to fetch activities", "error");
    } finally {
      setLoadingActivity(false);
    }
  };

  // Toggle suggestion selection
  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === suggestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(suggestions.map((_, i) => i)));
    }
  };

  // Insert selected items into Work Log
  const handleInsertToWorkLog = async () => {
    const itemsToInsert = suggestions.filter((_, idx) => selectedIndices.has(idx));
    if (itemsToInsert.length === 0) {
      toast("Please select at least one item to insert", "warning");
      return;
    }

    setInserting(true);
    try {
      for (const item of itemsToInsert) {
        const fd = new FormData();
        fd.append("date", item.date);
        fd.append("project", item.project);
        fd.append("category", item.category);
        fd.append("description", item.description);
        fd.append("output", item.output || "");
        fd.append("notes", "");
        fd.append("durationMinutes", String(item.durationMinutes || 60));

        const res = await fetch("/api/items/work-logs", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to add work log");
        }
      }

      toast("Work logs added!", "success");
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to insert work logs", "error");
    } finally {
      setInserting(false);
    }
  };

  // 2. Copy Standup Format
  const handleCopyStandup = async () => {
    if (copying) return;
    setCopying(true);

    try {
      const res = await fetch("/api/work-logs/today-activity");
      const json = await res.json();
      const todayLogs: TodayWorkLog[] = json.data?.todayLogs || [];
      const fallbackSuggestions: WorkLogSuggestion[] = json.data?.suggestions || [];

      const items = todayLogs.length > 0 ? todayLogs : fallbackSuggestions;
      const todayDate = formatDateLabel();

      const lines: string[] = [];
      if (items.length > 0) {
        for (const item of items) {
          const proj = item.project || "QA";
          const desc = item.description || "QA verification";
          const dur = formatDurationLabel(item.durationMinutes);
          const out = item.output ? ` - ${item.output}` : "";
          lines.push(`• ${proj}: ${desc} (${dur})${out}`);
        }
      } else {
        lines.push("• QA Ecosystem: Daily test execution and defect verification (4h) - Test passes completed");
      }
      lines.push("• Blockers: None");

      const standupReport = `*Daily Standup - ${todayDate}*\n${lines.join("\n")}`;

      try {
        await navigator.clipboard.writeText(standupReport);
      } catch {
        // Fallback for browsers with restricted clipboard permissions
        const textarea = document.createElement("textarea");
        textarea.value = standupReport;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      toast("Copied standup report to clipboard!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to copy standup format", "error");
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenPullModal}
          title="Pull today's verified bugs, test sessions, and standup notes"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100 transition active:scale-95"
        >
          <Sparkle size={14} weight="bold" className="text-violet-600" />
          Pull Today&apos;s Work
        </button>

        <button
          type="button"
          onClick={handleCopyStandup}
          disabled={copying}
          title="Copy today's work logs in Slack/Teams standup format"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-700 hover:bg-sky-100 transition active:scale-95 disabled:opacity-50"
        >
          <ClipboardText size={14} weight="bold" className="text-sky-600" />
          {copying ? "Copying..." : "Copy Standup Format"}
        </button>
      </div>

      <ModalShell
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Today's QA Activity & Suggested Logs"
        description="Activities detected from test sessions, verified bugs, and standup notes."
        maxWidth="2xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 border border-violet-200">
            <Sparkle size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-500">
              {selectedIndices.size} of {suggestions.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={inserting}
                className="h-8 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertToWorkLog}
                disabled={inserting || selectedIndices.size === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {inserting ? (
                  <>
                    <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={13} weight="bold" />
                    Insert to Work Log ({selectedIndices.size})
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        {loadingActivity ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 space-y-2">
            <ArrowsClockwise size={24} weight="bold" className="animate-spin text-violet-600" />
            <p className="text-xs font-medium">Scanning today&apos;s test sessions and bug activity...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QA Activity Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Flask size={15} weight="bold" />
                  <span className="text-xs font-bold">Test Sessions</span>
                </div>
                <div className="text-lg font-bold text-blue-900">{testSessions.length}</div>
                <p className="text-[11px] text-blue-600">
                  {testSessions.length > 0 ? "Executed today" : "None recorded today"}
                </p>
              </div>

              <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                <div className="flex items-center gap-2 text-rose-700 mb-1">
                  <Bug size={15} weight="bold" />
                  <span className="text-xs font-bold">Bugs Verified</span>
                </div>
                <div className="text-lg font-bold text-rose-900">{bugs.length}</div>
                <p className="text-[11px] text-rose-600">
                  {bugs.length > 0 ? "Verified / triaged today" : "None recorded today"}
                </p>
              </div>

              <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <ChatCenteredText size={15} weight="bold" />
                  <span className="text-xs font-bold">Standup Notes</span>
                </div>
                <div className="text-lg font-bold text-purple-900">{standupNotes.length}</div>
                <p className="text-[11px] text-purple-600">
                  {standupNotes.length > 0 ? "Synced with team" : "None recorded today"}
                </p>
              </div>
            </div>

            {/* Suggested Entries List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Suggested Work Log Entries
                </h4>
                {suggestions.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 hover:underline"
                  >
                    {selectedIndices.size === suggestions.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {suggestions.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
                  No activities detected today to convert into work logs.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {suggestions.map((item, idx) => {
                    const isChecked = selectedIndices.has(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleSelect(idx)}
                        className={cn(
                          "cursor-pointer rounded-lg border p-3 transition text-xs",
                          isChecked
                            ? "border-violet-300 bg-violet-50/30 shadow-xs"
                            : "border-gray-200 bg-white hover:border-gray-300 opacity-70"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="font-bold text-gray-900">{item.project}</span>
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                                {item.category}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-500">
                                <Clock size={11} weight="bold" />
                                {formatDurationLabel(item.durationMinutes)}
                              </span>
                            </div>
                            <p className="font-medium text-gray-800 leading-snug">{item.description}</p>
                            {item.output && (
                              <p className="mt-1 text-[11px] text-gray-500 leading-snug">
                                <span className="font-semibold text-gray-600">Deliverable:</span> {item.output}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalShell>
    </>
  );
}
