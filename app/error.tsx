"use client";

import { useEffect } from "react";
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-2 text-red-600">
        <WarningCircle size={28} weight="bold" />
        <h2 className="text-xl font-bold">Unexpected Error</h2>
      </div>
      <p className="max-w-md text-center text-sm text-gray-600">
        Something went wrong. Please try again or refresh the page.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2  bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
      >
        <ArrowClockwise size={16} weight="bold" />
        Try again
      </button>
    </div>
  );
}
