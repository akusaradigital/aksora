"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle,
  Clock,
  Check,
  ArrowsClockwise,
  Calendar,
  X,
  Plus,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ParsedItem {
  project: string;
  category: string;
  description: string;
  output?: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  date: string;
}

interface WorkLogQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

const SAMPLE_PROMPTS = [
  "Bug slicing MOT 4 jam, meeting sprint auracheck 1 jam, sisanya testing oronamin c 3.5 jam",
  "Development fitur filter table dan column visibility 5 jam, code review 3.5 jam",
  "Testing regression dan verifikasi defect 4 jam, sisanya feature enhancement MOT",
];

export function WorkLogQuickModal({ isOpen, onClose, defaultDate }: WorkLogQuickModalProps) {
  const router = useRouter();
  const todayStr = defaultDate || new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayStr);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  const handleParse = async () => {
    if (!text.trim()) {
      toast("Ketik laporan pekerjaan terlebih dahulu", "warning");
      return;
    }

    setParsing(true);
    try {
      const res = await fetch("/api/work-logs/quick-ai-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), date, saveDirectly: false }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal memproses kalimat pekerjaan");
      }
      const items: ParsedItem[] = json.data?.items || [];
      if (items.length === 0) {
        throw new Error("Tidak ada entri yang terdeteksi");
      }
      setParsedItems(items);
      toast(`Berhasil mengekstrak ${items.length} rincian pekerjaan`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal memproses dengan AI", "error");
    } finally {
      setParsing(false);
    }
  };

  const handleUpdateDuration = (index: number, minutes: number) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], durationMinutes: Math.max(15, minutes) };
      }
      return updated;
    });
  };

  const handleSaveAndSync = async () => {
    if (parsedItems.length === 0) return;
    setSaving(true);
    try {
      for (const item of parsedItems) {
        const fd = new FormData();
        fd.append("date", item.date || date);
        fd.append("project", item.project);
        fd.append("category", item.category);
        fd.append("description", item.description);
        fd.append("output", item.output || "");
        fd.append("notes", item.output || item.description);
        fd.append("durationMinutes", String(item.durationMinutes));
        if (item.startTime) fd.append("startTime", item.startTime);
        if (item.endTime) fd.append("endTime", item.endTime);

        const res = await fetch("/api/items/work-logs", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Gagal menyimpan entri");
        }
      }

      toast("Semua pekerjaan tersimpan dan tersinkronisasi ke Sicmundus!", "success");
      onClose();
      setText("");
      setParsedItems([]);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan entri", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = parsedItems.reduce((acc, item) => acc + (item.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const isTargetMet = totalMinutes >= 480;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Work Log (Input 1 Kalimat)"
      description="Ketik rangkuman pekerjaan dalam satu kalimat santai. AI akan mengekstrak jam, project, dan kategori secara otomatis."
      maxWidth="2xl"
      icon={
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
          <Sparkle size={18} weight="bold" />
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-gray-500">
            {parsedItems.length > 0 ? (
              <span className="font-semibold text-gray-700">
                Total: {totalHours} jam ({totalMinutes} menit)
                {isTargetMet ? (
                  <span className="ml-1.5 text-emerald-600 font-bold">✓ Memenuhi minimal 8 jam</span>
                ) : (
                  <span className="ml-1.5 text-amber-600 font-semibold">
                    (Kurang {((480 - totalMinutes) / 60).toFixed(1)} jam dari target 8h)
                  </span>
                )}
              </span>
            ) : (
              <span>Minimal target harian: 8 jam (bisa lembur/lebih)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || parsing}
              className="h-8 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Batal
            </button>
            {parsedItems.length > 0 ? (
              <button
                type="button"
                onClick={handleSaveAndSync}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                    Menyimpan & Sync...
                  </>
                ) : (
                  <>
                    <Check size={13} weight="bold" />
                    Simpan & Sync ke Sicmundus ({parsedItems.length})
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleParse}
                disabled={parsing || !text.trim()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {parsing ? (
                  <>
                    <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Sparkle size={13} weight="bold" />
                    Ekstrak & Preview
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Calendar size={14} weight="bold" className="text-gray-500" />
            Tanggal Kerja:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-800 outline-none focus:border-blue-500"
          />
        </div>

        {/* Input Textarea */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Ketik Laporan Pekerjaan:
          </label>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Contoh: Tadi ngerjain bug slicing MOT 4 jam, meeting sprint auracheck 1 jam, sisanya testing oronamin c 3.5 jam"
            className="w-full rounded-lg border border-gray-200 p-3 text-xs text-gray-800 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Example Chips */}
        <div>
          <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
            Contoh Format Cepat (Klik untuk pakai):
          </span>
          <div className="flex flex-col gap-1.5">
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setText(sample)}
                className="text-left text-[11px] text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-md px-2.5 py-1.5 transition"
              >
                &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Preview of Parsed Items */}
        {parsedItems.length > 0 && (
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Hasil Ekstraksi Entri ({parsedItems.length})
              </h4>
              <button
                type="button"
                onClick={() => setParsedItems([])}
                className="text-[11px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <X size={12} weight="bold" />
                Reset Preview
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {parsedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 text-xs transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-gray-900">{item.project}</span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                        {item.category}
                      </span>
                      {item.startTime && item.endTime && (
                        <span className="text-[11px] text-gray-500">
                          {item.startTime} - {item.endTime}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock size={12} weight="bold" className="text-gray-500" />
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={item.durationMinutes}
                        onChange={(e) => handleUpdateDuration(idx, parseInt(e.target.value, 10) || 60)}
                        className="w-14 h-6 text-center border border-gray-200 rounded bg-white text-xs font-bold text-gray-800"
                      />
                      <span className="text-[11px] text-gray-500">m</span>
                    </div>
                  </div>
                  <p className="font-medium text-gray-800 leading-snug">{item.description}</p>
                  {item.output && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      <span className="font-semibold text-gray-600">Output:</span> {item.output}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
