"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CaretLeft,
  CaretRight,
  Clock,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowsClockwise,
  Plus,
  Calendar,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { WorkLogFillGapModal } from "./work-log-fill-gap-modal";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: number | string;
  project: string;
  category: string;
  description: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  sicmundusEntryId?: string;
}

interface AuditDay {
  date: string;
  dayNumber: number;
  dayName: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
  totalMinutes: number;
  totalHours: number;
  missingMinutes: number;
  status: "compliant" | "under_target" | "missing" | "weekend" | "holiday";
  entriesCount: number;
  entries: AuditEntry[];
}

interface AuditSummary {
  totalDays: number;
  workingDays: number;
  compliantDays: number;
  underTargetDays: number;
  missingDays: number;
  totalHoursLogged: number;
  minTargetHours: number;
  completionRate: number;
}

interface WorkLogTimesheetAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkLogTimesheetAuditModal({ isOpen, onClose }: WorkLogTimesheetAuditModalProps) {
  const router = useRouter();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [days, setDays] = useState<AuditDay[]>([]);
  const [selectedDayForGap, setSelectedDayForGap] = useState<{ date: string; currentMinutes: number } | null>(null);

  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const fetchAudit = async (mStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-logs/timesheet-audit?month=${mStr}&target=480`);
      const json = await res.json();
      if (res.ok && json.data) {
        setSummary(json.data.summary);
        setDays(json.data.days || []);
      }
    } catch {
      // Swallowed, UI handles empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudit(monthStr);
    }
  }, [isOpen, monthStr]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Audit Timesheet & Kalender Kerja Sicmundus"
        description="Pantau pemenuhan target minimal 8 jam kerja setiap hari kerja, deteksi hari libur/cuti, dan lengkapi sisa waktu dengan 1 klik."
        maxWidth="2xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CalendarCheck size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-500">
              Target standar harian: <strong>minimal 8 jam (480m)</strong> pada hari kerja non-libur.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Tutup
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Month Selector Bar */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="h-8 w-8 rounded-md flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                title="Bulan sebelumnya"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <span className="text-sm font-bold text-gray-900 px-2 min-w-36 text-center">
                {monthNames[currentMonth - 1]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="h-8 w-8 rounded-md flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition"
                title="Bulan berikutnya"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchAudit(monthStr)}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              <ArrowsClockwise size={13} weight="bold" className={loading ? "animate-spin text-emerald-600" : ""} />
              Refresh
            </button>
          </div>

          {/* Month KPI Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                <span className="text-[11px] font-semibold text-emerald-700 block mb-0.5">Total Jam Tercatat:</span>
                <div className="text-lg font-bold text-emerald-950">
                  {summary.totalHoursLogged}h{" "}
                  <span className="text-xs font-normal text-emerald-700">/ {summary.minTargetHours}h min</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Progres: {summary.completionRate}%
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                <span className="text-[11px] font-semibold text-blue-700 block mb-0.5">Hari Lengkap (≥8h):</span>
                <div className="text-lg font-bold text-blue-950">
                  {summary.compliantDays}{" "}
                  <span className="text-xs font-normal text-blue-700">/ {summary.workingDays} hari kerja</span>
                </div>
                <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                  Memenuhi target minimal
                </div>
              </div>

              <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                <span className="text-[11px] font-semibold text-amber-700 block mb-0.5">Kurang Jam (&lt;8h):</span>
                <div className="text-lg font-bold text-amber-950">{summary.underTargetDays} Hari</div>
                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                  Perlu dilengkapi sisa jam
                </div>
              </div>

              <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                <span className="text-[11px] font-semibold text-rose-700 block mb-0.5">Belum Terisi (0h):</span>
                <div className="text-lg font-bold text-rose-950">{summary.missingDays} Hari</div>
                <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                  Hari kerja bolong
                </div>
              </div>
            </div>
          )}

          {/* Day-by-Day List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                <ArrowsClockwise size={24} weight="bold" className="animate-spin text-emerald-600 mb-2" />
                <p className="text-xs font-medium">Memuat audit timesheet bulanan...</p>
              </div>
            ) : days.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 border border-gray-200 rounded-lg">
                Tidak ada data timesheet untuk bulan ini.
              </div>
            ) : (
              days.map((day) => {
                const isCompliant = day.status === "compliant";
                const isUnder = day.status === "under_target";
                const isMissing = day.status === "missing";
                const isWeekend = day.status === "weekend";
                const isHoliday = day.status === "holiday";

                return (
                  <div
                    key={day.date}
                    className={cn(
                      "rounded-lg border p-3 text-xs transition",
                      isCompliant && "border-emerald-200 bg-emerald-50/20",
                      isUnder && "border-amber-200 bg-amber-50/20",
                      isMissing && "border-rose-200 bg-rose-50/30",
                      (isWeekend || isHoliday) && "border-gray-200 bg-gray-50/60 opacity-80"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Date & Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="text-center w-8 shrink-0">
                          <span className="text-sm font-bold text-gray-900 block leading-none">
                            {day.dayNumber}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-500">
                            {day.dayName.slice(0, 3)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900">{day.date}</span>
                            {day.holidayName && (
                              <span className="rounded bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[10px] font-bold">
                                {day.holidayName}
                              </span>
                            )}
                            {isWeekend && !day.holidayName && (
                              <span className="rounded bg-gray-100 text-gray-500 px-1.5 py-0.2 text-[10px] font-medium">
                                Akhir Pekan
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">
                            {day.entriesCount > 0
                              ? `${day.entriesCount} entri tercatat: ${day.entries.map((e) => e.project).join(", ")}`
                              : isWeekend || isHoliday
                              ? "Hari libur / tidak wajib input log"
                              : "Belum ada entri log tercatat"}
                          </p>
                        </div>
                      </div>

                      {/* Right: Hours Badge & Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isCompliant && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-md font-bold text-xs">
                            <CheckCircle size={13} weight="bold" />
                            {day.totalHours}h (Memenuhi min 8h)
                          </span>
                        )}

                        {isUnder && (
                          <>
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-1 rounded-md font-bold text-xs">
                              <WarningCircle size={13} weight="bold" />
                              {day.totalHours}h / min 8h
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedDayForGap({ date: day.date, currentMinutes: day.totalMinutes })}
                              className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-md font-bold text-[11px] transition"
                            >
                              <Plus size={11} weight="bold" />
                              Lengkapi +{((480 - day.totalMinutes) / 60).toFixed(1)}h
                            </button>
                          </>
                        )}

                        {isMissing && (
                          <>
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100/70 border border-rose-200 px-2 py-1 rounded-md font-bold text-xs">
                              <XCircle size={13} weight="bold" />
                              0h (Kosong)
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedDayForGap({ date: day.date, currentMinutes: 0 })}
                              className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-md font-bold text-[11px] transition"
                            >
                              <Plus size={11} weight="bold" />
                              Isi 8h Minimal
                            </button>
                          </>
                        )}

                        {(isWeekend || isHoliday) && day.totalMinutes > 0 && (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-1 rounded-md font-bold text-xs">
                            {day.totalHours}h (Lembur)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ModalShell>

      {/* Fill Gap Submodal */}
      {selectedDayForGap && (
        <WorkLogFillGapModal
          isOpen={true}
          onClose={() => {
            setSelectedDayForGap(null);
            fetchAudit(monthStr);
            router.refresh();
          }}
          date={selectedDayForGap.date}
          currentMinutes={selectedDayForGap.currentMinutes}
        />
      )}
    </>
  );
}
