"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

const MAX_WIDTH_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidth = "lg",
  children,
  footer,
  className,
  closeOnBackdrop = true,
}: ModalShellProps) {
  const [show, setShow] = useState(isOpen);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isOpen && !show) {
    setShow(true);
  }

  useEffect(() => {
    if (!isOpen && show) {
      timerRef.current = setTimeout(() => setShow(false), 150);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [isOpen, show]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen && !show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto transition-opacity duration-150",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
      />

      {/* Modal Dialog Box */}
      <div
        className={cn(
          "relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl transition-all duration-150",
          MAX_WIDTH_MAP[maxWidth],
          isOpen ? "scale-100" : "scale-95",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div>{children}</div>

        {/* Footer (if provided) */}
        {footer && <div className="border-t border-slate-100 pt-4 mt-5">{footer}</div>}
      </div>
    </div>
  );
}
