"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, WarningCircle, X, Info } from "@phosphor-icons/react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  signature: string;
  message: string;
  type: ToastType;
  expiresAt?: number;
  remaining?: number;
  actionLabel?: string;
  onAction?: () => void;
}

type ToastOptions = {
  duration?: number;
  countdown?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastHandler = (message: string, type: ToastType, options?: ToastOptions) => void;

let toastFn: ToastHandler | undefined;
const activeToastSignatures = new Set<string>();

function buildToastSignature(message: string, type: ToastType, options?: ToastOptions) {
  return [
    type,
    message,
    options?.duration ?? 2000,
    options?.countdown ? 1 : 0,
    options?.actionLabel ?? "",
    options?.onAction ? 1 : 0,
  ].join("|");
}

export function toast(message: string, type: ToastType = "success", options?: ToastOptions) {
  if (!toastFn) return;
  const signature = buildToastSignature(message, type, options);
  if (activeToastSignatures.has(signature)) return;
  toastFn(message, type, options);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const defaultDuration = 2000;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler: ToastHandler = (message, type, options) => {
      const id = Math.random().toString(36).substring(2, 9);
      const signature = buildToastSignature(message, type, options);
      const duration = options?.duration ?? defaultDuration;
      activeToastSignatures.add(signature);
      setToasts((prev) => [...prev, {
        id,
        signature,
        message,
        type,
        expiresAt: options?.countdown ? Date.now() + duration : undefined,
        remaining: options?.countdown ? Math.ceil(duration / 1000) : undefined,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
      }]);
      setTimeout(() => {
        activeToastSignatures.delete(signature);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };
    toastFn = handler;
    return () => {
      if (toastFn === handler) {
        toastFn = undefined;
      }
      activeToastSignatures.clear();
    };
  }, []);

  // Update countdown remaining seconds via interval (avoids impure Date.now() in render)
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setToasts((prev) => {
        const hasCountdown = prev.some((t) => t.expiresAt != null);
        if (!hasCountdown) return prev;
        const now = Date.now();
        return prev.map((t) =>
          t.expiresAt != null
            ? { ...t, remaining: Math.max(1, Math.ceil((t.expiresAt - now) / 1000)) }
            : t
        );
      });
    }, 250);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const removeToast = useCallback((id: string, signature: string) => {
    activeToastSignatures.delete(signature);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.slice(-3).map((t) => (
        <div
          key={t.id}
          className="flex min-w-[280px] max-w-md items-center gap-2.5 border border-gray-200 bg-white p-3 shadow-lg animate-in fade-in duration-100"
        >
          {t.type === "success" && <CheckCircle size={18} className="text-emerald-500 shrink-0" weight="fill" />}
          {t.type === "error" && <WarningCircle size={18} className="text-rose-500 shrink-0" weight="fill" />}
          {t.type === "info" && <Info size={18} className="text-blue-500 shrink-0" weight="fill" />}

          <p className="flex-1 text-xs font-medium text-gray-800">
            {t.message}
            {t.remaining != null ? ` ${t.remaining}s` : ""}
          </p>
          {t.onAction && (
            <button
              onClick={() => {
                t.onAction?.();
                removeToast(t.id, t.signature);
              }}
              className="border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
            >
              {t.actionLabel ?? "Undo"}
            </button>
          )}

          <button
            onClick={() => removeToast(t.id, t.signature)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
