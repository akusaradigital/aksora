"use client";

import { useEffect, useRef, useState } from "react";
import {
  FloppyDisk,
  ShareNetwork,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DashboardFilterFormProps {
  onSave: (name: string, shared: boolean) => Promise<{ error?: string }>;
  onClose: () => void;
}

export function DashboardFilterForm({ onSave, onClose }: DashboardFilterFormProps) {
  const [saveName, setSaveName] = useState("");
  const [shareToggle, setShareToggle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = async () => {
    const name = saveName.trim();
    if (name.length < 1 || name.length > 50) {
      setSaveError("Name must be between 1 and 50 characters");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const result = await onSave(name, shareToggle);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveName("");
        setShareToggle(false);
        onClose();
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2  border border-gray-200 bg-white p-2 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        value={saveName}
        onChange={(e) => {
          setSaveName(e.target.value);
          if (saveError) setSaveError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onClose();
        }}
        placeholder="Filter name (1–50 chars)"
        maxLength={50}
        className="h-7 w-40  border border-gray-200 px-2 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
        data-testid="filter-name-input"
      />

      {/* Share toggle */}
      <button
        type="button"
        onClick={() => setShareToggle((v) => !v)}
        className={cn(
          "inline-flex h-7 items-center gap-1  border px-2 text-[11px] font-semibold transition",
          shareToggle
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
        )}
        title={shareToggle ? "Shared with company" : "Private filter"}
        data-testid="share-toggle"
      >
        <ShareNetwork size={11} weight="bold" />
        {shareToggle ? "Shared" : "Private"}
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || saveName.trim().length === 0}
        className="h-7  bg-sky-600 px-3 text-[11px] font-bold text-white transition hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="save-filter-confirm"
      >
        {saving ? "Saving…" : "Save"}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition"
        title="Cancel"
      >
        <X size={13} weight="bold" />
      </button>

      {saveError && (
        <span className="w-full text-[11px] font-medium text-rose-600" data-testid="save-filter-error">
          {saveError}
        </span>
      )}
    </div>
  );
}

export function SaveFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5  border border-sky-200 bg-sky-50 px-2.5 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100 hover:border-sky-300"
      data-testid="save-filter-btn"
    >
      <FloppyDisk size={12} weight="bold" />
      Save Filter
    </button>
  );
}
