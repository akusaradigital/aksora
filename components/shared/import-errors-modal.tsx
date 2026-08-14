"use client";

import { WarningCircle, X } from "@phosphor-icons/react";

export type ImportRowError = { row: number; message: string };

interface ImportErrorsModalProps {
  isOpen: boolean;
  errors: ImportRowError[];
  onClose: () => void;
  title?: string;
}

export function ImportErrorsModal({
  isOpen,
  errors,
  onClose,
  title = "Import failed",
}: ImportErrorsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col bg-white border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <WarningCircle size={18} weight="bold" className="text-red-600" />
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <p className="mb-2 text-xs text-gray-500">
            {errors.length} row{errors.length !== 1 ? "s" : ""} could not be imported:
          </p>
          <ul className="divide-y divide-red-100 border border-red-100 bg-red-50">
            {errors.map((err, i) => (
              <li key={`${err.row}-${i}`} className="px-3 py-2 text-[11px] text-red-700">
                <span className="font-bold">Row {err.row}:</span> {err.message}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="h-8 bg-gray-800 px-4 text-xs font-bold text-white hover:bg-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
