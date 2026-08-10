"use client";

import { useState } from "react";
import { Compass, CheckCircle } from "@phosphor-icons/react";
import { resetOnboarding } from "@/components/layout/onboarding-tour";

export function RestartTourButton() {
  const [restarted, setRestarted] = useState(false);

  function handleRestart() {
    resetOnboarding();
    setRestarted(true);
    setTimeout(() => setRestarted(false), 3000);
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-100">
      <div className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-100">
        <Compass size={24} className="text-blue-500 shrink-0" weight="bold" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-800">Onboarding Tour</h4>
          <p className="text-xs text-gray-500 leading-relaxed mt-1">
            Restart the guided tour to revisit the platform walkthrough and learn about key features.
          </p>
          <button
            type="button"
            onClick={handleRestart}
            disabled={restarted}
            className="mt-3 inline-flex h-8 items-center gap-2 border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
          >
            {restarted ? (
              <>
                <CheckCircle size={14} weight="bold" className="text-emerald-500" />
                Tour will restart on next page load
              </>
            ) : (
              <>
                <Compass size={14} weight="bold" />
                Restart Tour
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

