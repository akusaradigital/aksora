"use client";

import { useEffect, useState } from "react";
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
  CalendarCheck,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { WorkLogQuickModal } from "./work-log-quick-modal";
import { WorkLogTimesheetAuditModal } from "./work-log-timesheet-audit-modal";
import { WorkLogFillGapModal } from "./work-log-fill-gap-modal";
import { getSicmundusAuthPayload } from "@/lib/sicmundus-client";
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

  // Modals state
  const [isPullOpen, setIsPullOpen] = useState(false);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isFillGapOpen, setIsFillGapOpen] = useState(false);

  // Today's summary state
  const [todayMinutes, setTodayMinutes] = useState<number | null>(null);
  const [loadingToday, setLoadingToday] = useState(false);

  // QA activity state
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [syncingSicmundus, setSyncingSicmundus] = useState(false);

  const [bugs, setBugs] = useState<BugActivity[]>([]);
  const [testSessions, setTestSessions] = useState<TestSessionActivity[]>([]);
  const [standupNotes, setStandupNotes] = useState<StandupNoteActivity[]>([]);
  const [suggestions, setSuggestions] = useState<WorkLogSuggestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const fetchTodayStatus = async () => {
    try {
      const res = await fetch("/api/dashboard/timesheet-status");
      if (res.ok) {
        const json = await res.json();
        setTodayMinutes(json.data?.todayMinutes ?? 0);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  // 1. Pull Today's Work
  const handleOpenPullModal = async () => {
    setIsPullOpen(true);
    setLoadingActivity(true);
    try {
      const res = await fetch("/api/work-logs/today-activity");
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal memuat aktivitas QA hari ini");
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
      toast(err instanceof Error ? err.message : "Gagal mengambil aktivitas", "error");
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
      toast("Pilih minimal satu item untuk dimasukkan", "warning");
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
        fd.append("notes", item.output || item.description);
        fd.append("durationMinutes", String(item.durationMinutes || 60));

        const res = await fetch("/api/items/work-logs", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Gagal menambahkan log kerja");
        }
      }

      toast("Log kerja berhasil ditambahkan dan sync ke Sicmundus!", "success");
      setIsPullOpen(false);
      fetchTodayStatus();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menambahkan log kerja", "error");
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
          const out = item.output ? ` : ${item.output}` : "";
          lines.push(`• ${proj}: ${desc} (${dur})${out}`);
        }
      } else {
        lines.push("• QA Ecosystem: Daily test execution and defect verification (4h) : Test passes completed");
      }
      lines.push("• Blockers: None");

      const standupReport = `*Daily Standup : ${todayDate}*\n${lines.join("\n")}`;

      try {
        await navigator.clipboard.writeText(standupReport);
      } catch {
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

      toast("Laporan standup berhasil disalin ke clipboard!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyalin format standup", "error");
    } finally {
      setCopying(false);
    }
  };

  const handleSyncSicmundus = async () => {
    setSyncingSicmundus(true);
    try {
      const authPayload = getSicmundusAuthPayload();
      const res = await fetch("/api/work-logs/sync-sicmundus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authPayload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal sinkronisasi Sicmundus");
      }
      toast(json.message || "Sinkronisasi Sicmundus berhasil!", "success");
      fetchTodayStatus();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal sinkronisasi Sicmundus", "error");
    } finally {
      setSyncingSicmundus(false);
    }
  };

  const todayHoursFormatted = todayMinutes !== null ? (todayMinutes / 60).toFixed(1) : "0.0";
  const isTodayTargetMet = todayMinutes !== null && todayMinutes >= 480;
  const todayRemainingMinutes = todayMinutes !== null ? Math.max(0, 480 - todayMinutes) : 480;
  const todayRemainingHours = (todayRemainingMinutes / 60).toFixed(1);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Today's Daily 8h Target Indicator */}
        {todayMinutes !== null && (
          <div
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition",
              isTodayTargetMet
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            )}
            title={`Hari ini: ${todayHoursFormatted} jam tercatat. Target minimal harian adalah 8 jam.`}
          >
            {isTodayTargetMet ? (
              <>
                <CheckCircle size={14} weight="bold" className="text-emerald-600" />
                <span>Hari Ini: <strong>{todayHoursFormatted}h</strong> (Min 8h ✓)</span>
              </>
            ) : (
              <>
                <WarningCircle size={14} weight="bold" className="text-amber-600" />
                <span>Hari Ini: <strong>{todayHoursFormatted}h</strong> / 8h min</span>
                <button
                  type="button"
                  onClick={() => setIsFillGapOpen(true)}
                  className="ml-1 rounded bg-amber-600 hover:bg-amber-700 text-white px-1.5 py-0.5 text-[10px] font-bold transition"
                  title="Genapkan waktu kerja ke minimal 8 jam"
                >
                  +{todayRemainingHours}h
                </button>
              </>
            )}
          </div>
        )}

        {/* Quick Log AI (1 Kalimat) */}
        <button
          type="button"
          onClick={() => setIsQuickLogOpen(true)}
          title="Input cepat pekerjaan harian hanya dengan 1 kalimat santai"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95"
        >
          <Sparkle size={14} weight="bold" className="text-blue-600" />
          Quick Log (1 Kalimat)
        </button>

        {/* Timesheet Audit (Kalender Bulanan) */}
        <button
          type="button"
          onClick={() => setIsAuditOpen(true)}
          title="Buka audit kalender timesheet bulanan Sicmundus dan lengkapi hari yang bolong"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition active:scale-95"
        >
          <CalendarCheck size={14} weight="bold" className="text-emerald-600" />
          Audit Timesheet
        </button>

        {/* Pull Today's QA Activity */}
        <button
          type="button"
          onClick={handleOpenPullModal}
          title="Tarik otomatis bug, sesi pengujian, dan catatan standup hari ini"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100 transition active:scale-95"
        >
          <Clock size={14} weight="bold" className="text-violet-600" />
          Tarik Aktivitas QA
        </button>

        {/* Copy Standup */}
        <button
          type="button"
          onClick={handleCopyStandup}
          disabled={copying}
          title="Salin log kerja hari ini dalam format standup Slack atau Teams"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-700 hover:bg-gray-100 transition active:scale-95 disabled:opacity-50"
        >
          <ClipboardText size={14} weight="bold" className="text-gray-600" />
          {copying ? "Menyalin..." : "Salin Standup"}
        </button>

        {/* Sync Sicmundus */}
        <button
          type="button"
          onClick={handleSyncSicmundus}
          disabled={syncingSicmundus}
          title="Sinkronkan entri waktu dua arah dengan Sicmundus"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition active:scale-95 disabled:opacity-50"
        >
          <ArrowsClockwise size={14} weight="bold" className={cn("text-indigo-600", syncingSicmundus && "animate-spin")} />
          {syncingSicmundus ? "Syncing..." : "Sync Sicmundus"}
        </button>
      </div>

      {/* Submodal 1: Quick Log (1 Kalimat) */}
      <WorkLogQuickModal
        isOpen={isQuickLogOpen}
        onClose={() => {
          setIsQuickLogOpen(false);
          fetchTodayStatus();
        }}
      />

      {/* Submodal 2: Monthly Timesheet Audit */}
      <WorkLogTimesheetAuditModal
        isOpen={isAuditOpen}
        onClose={() => {
          setIsAuditOpen(false);
          fetchTodayStatus();
        }}
      />

      {/* Submodal 3: Fill Today's Gap */}
      <WorkLogFillGapModal
        isOpen={isFillGapOpen}
        onClose={() => {
          setIsFillGapOpen(false);
          fetchTodayStatus();
        }}
        date={new Date().toISOString().slice(0, 10)}
        currentMinutes={todayMinutes ?? 0}
      />

      {/* Submodal 4: Pull Today's Work Modal */}
      <ModalShell
        isOpen={isPullOpen}
        onClose={() => setIsPullOpen(false)}
        title="Aktivitas QA Hari Ini & Saran Log"
        description="Aktivitas yang terdeteksi dari sesi pengujian, bug yang diverifikasi, dan catatan standup."
        maxWidth="2xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 border border-violet-200">
            <Sparkle size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-500">
              {selectedIndices.size} dari {suggestions.length} item dipilih
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPullOpen(false)}
                disabled={inserting}
                className="h-8 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Batal
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
                    Menambahkan...
                  </>
                ) : (
                  <>
                    <Plus size={13} weight="bold" />
                    Masukkan ke Log ({selectedIndices.size})
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
            <p className="text-xs font-medium">Memindai sesi pengujian dan aktivitas bug hari ini...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QA Activity Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Flask size={15} weight="bold" />
                  <span className="text-xs font-bold">Sesi Pengujian</span>
                </div>
                <div className="text-lg font-bold text-blue-900">{testSessions.length}</div>
                <p className="text-[11px] text-blue-600">
                  {testSessions.length > 0 ? "Dijalankan hari ini" : "Tidak ada tercatat"}
                </p>
              </div>

              <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                <div className="flex items-center gap-2 text-rose-700 mb-1">
                  <Bug size={15} weight="bold" />
                  <span className="text-xs font-bold">Bug Terverifikasi</span>
                </div>
                <div className="text-lg font-bold text-rose-900">{bugs.length}</div>
                <p className="text-[11px] text-rose-600">
                  {bugs.length > 0 ? "Diverifikasi hari ini" : "Tidak ada tercatat"}
                </p>
              </div>

              <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <ChatCenteredText size={15} weight="bold" />
                  <span className="text-xs font-bold">Catatan Standup</span>
                </div>
                <div className="text-lg font-bold text-purple-900">{standupNotes.length}</div>
                <p className="text-[11px] text-purple-600">
                  {standupNotes.length > 0 ? "Tersinkron dengan tim" : "Tidak ada tercatat"}
                </p>
              </div>
            </div>

            {/* Suggested Entries List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Saran Entri Log Kerja
                </h4>
                {suggestions.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 hover:underline"
                  >
                    {selectedIndices.size === suggestions.length ? "Batal Pilih Semua" : "Pilih Semua"}
                  </button>
                )}
              </div>

              {suggestions.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
                  Tidak ada aktivitas terdeteksi hari ini untuk dikonversi menjadi log kerja.
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
