"use client";

import {
  Key,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  Eye,
  EyeSlash,
  ArrowSquareOut,
  Trash,
  Check,
  Globe,
  Cpu,
} from "@phosphor-icons/react";
import {
  AI_PROVIDER_LABELS,
  type SupportedProvider,
} from "@/lib/ai-service";

export interface ProviderCardState {
  status: "connected" | "saved" | "disconnected";
  keyInput: string;
  urlInput?: string;
  validating: boolean;
  latencyMs?: number;
  selectedModel: string;
  models: string[];
  showSecret: boolean;
}

interface AIProviderCardProps {
  provider: SupportedProvider;
  state: ProviderCardState;
  isActive: boolean;
  isCustom: boolean;
  isFetchingModels: boolean;
  onKeyChange: (val: string) => void;
  onUrlChange?: (val: string) => void;
  onModelChange: (model: string) => void;
  onToggleCustomMode: () => void;
  onToggleShowSecret: () => void;
  onFetchModels: () => void;
  onSaveKey: () => void;
  onRemoveKey: () => void;
  onTestConnection: () => void;
  onSetActive: () => void;
}

export function AIProviderCard({
  provider,
  state,
  isActive,
  isCustom,
  isFetchingModels,
  onKeyChange,
  onUrlChange,
  onModelChange,
  onToggleCustomMode,
  onToggleShowSecret,
  onFetchModels,
  onSaveKey,
  onRemoveKey,
  onTestConnection,
  onSetActive,
}: AIProviderCardProps) {
  const meta = AI_PROVIDER_LABELS[provider];
  const isLocal = provider === "9router";
  const isPublicRouter = provider === "9router-public";
  const isConfigured = state.status === "connected" || state.status === "saved";
  const isCardActive = isActive && isConfigured;

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition ${
        isCardActive
          ? "border-blue-500 ring-2 ring-blue-500/10 shadow-sm"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${meta.color}`}
            >
              {isLocal ? (
                <Cpu size={16} weight="bold" />
              ) : isPublicRouter ? (
                <Globe size={16} weight="bold" />
              ) : (
                provider.slice(0, 2).toUpperCase()
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{meta.label}</h4>
                {isCardActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    <Check size={10} weight="bold" />
                    Active
                  </span>
                )}
              </div>
              <a
                href={meta.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
              >
                {isLocal ? "Local Dashboard (port 20128)" : "Get API Key"}
                <ArrowSquareOut size={11} />
              </a>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {state.status === "connected" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle size={12} weight="bold" />
                Connected {state.latencyMs ? `(${state.latencyMs}ms)` : ""}
              </span>
            ) : state.status === "saved" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <Key size={12} weight="bold" />
                Key Saved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                <XCircle size={12} weight="bold" />
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Input Fields */}
        <div className="mt-4 space-y-3.5">
          {/* For 9Router Public: Base URL field */}
          {isPublicRouter && onUrlChange && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Router Base URL
              </label>
              <input
                type="text"
                value={state.urlInput || ""}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://your-tunnel.example.com/v1"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          )}

          {/* API Key field */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {isLocal
                ? "Local Token (Optional)"
                : isPublicRouter
                ? "Bearer Key (Optional)"
                : "API Key"}
            </label>
            <div className="relative flex items-center">
              <input
                type={state.showSecret ? "text" : "password"}
                value={state.keyInput}
                onChange={(e) => onKeyChange(e.target.value)}
                placeholder={meta.placeholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-9 font-mono text-xs outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
              <button
                type="button"
                onClick={onToggleShowSecret}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                title={state.showSecret ? "Hide secret" : "Show secret"}
              >
                {state.showSecret ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Model Selector & Dynamic Discovery */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Default Model</label>
              <div className="flex items-center gap-2">
                {(state.keyInput.trim() || isLocal || isPublicRouter) && (
                  <button
                    type="button"
                    disabled={isFetchingModels}
                    onClick={onFetchModels}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
                    title="Fetch live models directly from provider API"
                  >
                    <ArrowsClockwise
                      size={12}
                      weight="bold"
                      className={isFetchingModels ? "animate-spin text-blue-600" : ""}
                    />
                    {isFetchingModels ? "Fetching..." : "Fetch Models"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onToggleCustomMode}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700 transition"
                >
                  {isCustom ? "Select from list" : "Custom model"}
                </button>
              </div>
            </div>

            {isCustom ? (
              <input
                type="text"
                value={state.selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder="e.g. gpt-4.5-preview, gemini-2.5-pro"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            ) : state.models.length > 0 ? (
              <select
                value={state.selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                {state.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={state.selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder={isFetchingModels ? "Fetching available models..." : "Input API key to load models, or type here..."}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
        <div className="flex items-center gap-1.5">
          {isConfigured ? (
            <button
              type="button"
              onClick={onRemoveKey}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              title="Remove saved credentials"
            >
              <Trash size={13} weight="bold" />
              Remove
            </button>
          ) : (state.keyInput.trim() || (isPublicRouter && state.urlInput?.trim())) ? (
            <button
              type="button"
              onClick={onSaveKey}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              title="Save key to browser storage"
            >
              <Key size={13} weight="bold" />
              Save
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={state.validating}
            onClick={onTestConnection}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowsClockwise
              size={13}
              weight="bold"
              className={state.validating ? "animate-spin text-blue-600" : ""}
            />
            {state.validating ? "Testing..." : "Test Connection"}
          </button>

          <button
            type="button"
            onClick={onSetActive}
            className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold transition shadow-xs ${
              isCardActive
                ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-default"
                : isConfigured
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
            }`}
            disabled={!isConfigured || isCardActive}
          >
            {isCardActive ? (
              <>
                <Check size={13} weight="bold" />
                Active
              </>
            ) : (
              "Use as Active"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
