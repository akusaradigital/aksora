"use client";

import { useEffect, useRef, useState } from "react";
import { Warning, X, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info" | "warning";
}

export function ConfirmModal({
  isOpen,
  title = "Confirmation",
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning"
}: ConfirmModalProps) {
  const [show, setShow] = useState(isOpen);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isOpen && !show) {
    setShow(true);
  }

  useEffect(() => {
    if (!isOpen && show) {
      timerRef.current = setTimeout(() => setShow(false), 150);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [isOpen, show]);

  if (!isOpen && !show) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-150",
      isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      <div className={cn(
        "relative w-full max-w-sm bg-white border border-gray-200 shadow-md transition-all duration-150",
        isOpen ? "scale-100" : "scale-95"
      )}>
        <div className="flex flex-col items-center text-center px-5 pt-5 pb-3">
          <div className={cn(
            "mb-3 flex h-9 w-9 items-center justify-center text-white",
            type === "danger" ? "bg-red-600" :
            type === "warning" ? "bg-amber-500" :
            "bg-blue-600"
          )}>
            {type === "danger" ? <X size={18} weight="bold" /> :
            type === "warning" ? <Warning size={18} weight="bold" /> :
            <Check size={18} weight="bold" />}
          </div>
          <h3 className="mb-1 text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 px-5 pb-4">
          <button
            onClick={onCancel}
            className="flex-1 h-8 border border-gray-200 bg-white text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className={cn(
              "flex-1 h-8 text-xs font-medium text-white transition",
              type === "danger" ? "bg-red-600 hover:bg-red-700" :
              type === "warning" ? "bg-amber-500 hover:bg-amber-600" :
              "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
