"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Check,
  ArrowsClockwise,
  Plus,
  Calendar,
  Warning,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";

interface WorkLogFillGapModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  currentMinutes?: number;
}

const COMMON_PROJECTS = ["MOT - Asset", "AURA", "Oronamin C", "QA Ecosystem"];
const COMMON_CATEGORIES = [
  { value: "development", label: "Development / Feature" },
  { value: "bugfix", label: "Bug Fixing & Slicing" },
  { value: "testing", label: "Testing & QA" },
  { value: "meeting", label: "Sprint Meeting & Standup" },
];

export function WorkLogFillGapModal({
  isOpen,
  onClose,
  date,
  currentMinutes = 0,
}: WorkLogFillGapModalProps) {
  const router = useRouter();

  const [targetHours, setTargetHours] = useState(8);
  const [project, setProject] = useState(COMMON_PROJECTS[0]);
  const [category, setCategory] = useState("development");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const targetMinutes = Math.round(targetHours * 60);
  const missingMinutes = Math.max(0, targetMinutes - currentMinutes);
  const missingHoursFormatted = (missingMinutes / 60).toFixed(1);
  const currentHoursFormatted = (currentMinutes / 60).toFixed(1);

  const handleFillGap = async () => {
    if (missingMinutes <= 0) {
      toast("Target jam untuk tanggal ini sudah tercapai", "info");
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/work-logs/fill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          targetMinutes,
          project,
          category,
          description: description.trim() || `Penyelesaian dan verifikasi task ${project}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal mengisi sisa waktu");
      }

      toast(`Berhasil menambahkan ${missingHoursFormatted} jam dan sync ke Sicmundus!`, "success");
      onClose();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengisi sisa jam", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Lengkapi Jam Kerja Harian (Minimal 8 Jam)"
      description={`Tambahkan entri untuk menggenapkan waktu kerja tanggal ${date} agar mencapai target minimal 8 jam.`}
      maxWidth="md"
      icon={
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
          <Clock size={18} weight="bold" />
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-500">
            Akan dibuat entri baru: <strong>{missingHoursFormatted} jam ({missingMinutes}m)</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleFillGap}
              disabled={loading || missingMinutes <= 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <ArrowsClockwise size={13} weight="bold" className="animate-spin" />
                  Mengisi & Sync...
                </>
              ) : (
                <>
                  <Plus size={13} weight="bold" />
                  Isi Sisa {missingHoursFormatted}h & Sync
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status Box */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500 block">Jam Saat Ini:</span>
            <span className="text-sm font-bold text-gray-900">{currentHoursFormatted} Jam ({currentMinutes}m)</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-gray-500 block">Kekurangan:</span>
            <span className="text-sm font-bold text-amber-600">+{missingHoursFormatted} Jam ({missingMinutes}m)</span>
          </div>
        </div>

        {/* Target Setting */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Target Jam Minimum Harian:
          </label>
          <div className="flex items-center gap-2">
            {[8, 8.5, 9, 10].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setTargetHours(h)}
                className={`flex-1 h-8 rounded-lg text-xs font-bold border transition ${
                  targetHours === h
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {h} Jam {h === 8 ? "(Standar)" : "(Lembur)"}
              </button>
            ))}
          </div>
        </div>

        {/* Project Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Pilih Project:
          </label>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 outline-none focus:border-emerald-500"
          >
            {COMMON_PROJECTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Kategori Pekerjaan:
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 outline-none focus:border-emerald-500"
          >
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Deskripsi / Rincian Pekerjaan:
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Contoh: Implementasi & verification fitur ${project}`}
            className="w-full h-8 rounded-lg border border-gray-200 px-3 text-xs text-gray-800 outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </ModalShell>
  );
}
