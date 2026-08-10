"use client";

import { useEffect } from "react";
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react";

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Module page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-2 text-red-600">
        <WarningCircle size={24} weight="bold" />
        <h2 className="text-lg font-bold">Something went wrong</h2>
      </div>
      <p className="max-w-md text-center text-sm text-slate-600">
        An error occurred while loading this page. This might be a temporary issue.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        <ArrowClockwise size={16} weight="bold" />
        Try again
      </button>
    </div>
  );
}
