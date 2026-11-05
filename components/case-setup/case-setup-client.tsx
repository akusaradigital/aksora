"use client";

import { useState } from "react";
import { CaseFieldsTab } from "./case-fields-tab";
import { TemplatesTab } from "./templates-tab";

const TABS = [
  { id: "templates", label: "Templates" },
  { id: "fields", label: "Case fields" },
] as const;

export function CaseSetupClient({ canManage }: { canManage: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("templates");

  return (
    <div className="space-y-6">
      <div role="tablist" className="flex border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-xs font-bold ${tab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "templates" ? <TemplatesTab canManage={canManage} /> : <CaseFieldsTab canManage={canManage} />}
    </div>
  );
}
