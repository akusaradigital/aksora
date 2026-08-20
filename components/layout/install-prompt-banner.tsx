"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPromptBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 border border-gray-200 bg-white p-3 shadow-lg">
      <DownloadSimple size={20} weight="bold" className="shrink-0 text-blue-600" />
      <p className="flex-1 text-xs font-medium text-gray-700">Install Aksora for quick access</p>
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="shrink-0 bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
      >
        Install
      </button>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 text-gray-400 hover:text-gray-600">
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
