"use client";

import { Robot } from "@phosphor-icons/react";
import {
  SUPPORTED_PROVIDERS,
  AI_PROVIDER_LABELS,
  type SupportedProvider,
} from "@/lib/ai-service";
import type { ProviderCardState } from "./ai-provider-card";

interface AIStatusCardProps {
  isConfigured: boolean;
  activeProvider: string;
  activeModel: string;
  providerStates: Record<string, ProviderCardState>;
  onSetActive: (provider: string) => void;
  onModelChange: (provider: string, model: string) => void;
}

const QA_CAPABILITIES = [
  { name: "Test Case Generator", menu: "/test-cases", desc: "User story to test cases" },
  { name: "Bug Report Enhancer", menu: "/bugs", desc: "Auto-reproduce & severity" },
  { name: "Regression Test Builder", menu: "/bugs", desc: "Bug to regression suite" },
  { name: "Duplicate Bug Detector", menu: "/bugs", desc: "Semantic similarity guard" },
  { name: "Automation Exporter", menu: "/test-cases", desc: "Playwright & Cypress TS" },
  { name: "Smoke Suite Assembler", menu: "/test-cases", desc: "Targeted critical paths" },
  { name: "Root Cause Analyzer", menu: "/bugs", desc: "Code hypothesis & hints" },
  { name: "Flaky Test Quarantine", menu: "/test-cases", desc: "Volatility & flip tracker" },
  { name: "Standup Digest", menu: "/test-sessions", desc: "Slack/Discord team summary" },
  { name: "Screenshot OCR", menu: "/bugs", desc: "Visual defect extraction" },
  { name: "Release Notes Generator", menu: "/test-sessions", desc: "Executive & dev changelog" },
  { name: "QA Copilot", menu: "Global Header", desc: "Natural language QA query" },
];

export function AIStatusCard({
  isConfigured,
  activeProvider,
  activeModel,
  providerStates,
  onSetActive,
  onModelChange,
}: AIStatusCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
              isConfigured ? "bg-blue-50 text-blue-600 shadow-xs" : "bg-slate-100 text-slate-400"
            }`}
          >
            <Robot size={26} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">AI Agents Status</h2>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  AI Agents: ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  AI Agents: INACTIVE
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xl">
              {isConfigured ? (
                <>
                  Mesin AI siap digunakan di seluruh workspace. Sedang ditenagai oleh{" "}
                  <strong className="text-slate-900 font-semibold">
                    {AI_PROVIDER_LABELS[activeProvider as SupportedProvider]?.label || activeProvider}
                  </strong>{" "}
                  dengan model{" "}
                  <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-semibold">
                    {activeModel}
                  </code>
                  .
                </>
              ) : (
                "AI Agents belum aktif. Hubungkan salah satu provider di bawah (misal 9Router atau Gemini), lalu klik 'Use as Active' untuk mengaktifkan AI di menu Test Cases, Bugs, dan Test Sessions."
              )}
            </p>
          </div>
        </div>

        {/* Quick Active Provider Switcher */}
        {isConfigured && (
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={activeProvider}
              onChange={(e) => onSetActive(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              {SUPPORTED_PROVIDERS.filter(
                (p) => providerStates[p]?.status === "connected" || providerStates[p]?.status === "saved"
              ).map((p) => (
                <option key={p} value={p}>
                  {AI_PROVIDER_LABELS[p]?.label}
                </option>
              ))}
            </select>

            {providerStates[activeProvider]?.models?.length > 0 && (
              <select
                value={activeModel}
                onChange={(e) => onModelChange(activeProvider, e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                {providerStates[activeProvider].models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Feature Capabilities Indicator */}
      <div className="pt-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Status Kapabilitas Fitur QA
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {QA_CAPABILITIES.map((cap, i) => (
            <div
              key={i}
              className={`flex flex-col rounded-xl border p-2.5 transition ${
                isConfigured
                  ? "bg-slate-50/80 border-slate-200 text-slate-800"
                  : "bg-slate-50/40 border-slate-200/60 opacity-60 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{cap.name}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConfigured ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">{cap.desc}</span>
              <span className="text-[10px] font-medium text-blue-600 mt-1">{cap.menu}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
