"use client";

import { useEffect, useState } from "react";
import {
  Robot,
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
import { toast } from "@/components/ui/toast";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  getAllKeys,
  setApiKey,
  removeApiKey,
  getActiveAiConfig,
  setActiveAiConfig,
  get9RouterPublicConfig,
  set9RouterPublicConfig,
} from "@/lib/ai-keys";
import {
  SUPPORTED_PROVIDERS,
  DEFAULT_AI_MODELS,
  AI_PROVIDER_LABELS,
  type SupportedProvider,
} from "@/lib/ai-service";

interface ProviderState {
  status: "connected" | "saved" | "disconnected";
  keyInput: string;
  urlInput?: string;
  validating: boolean;
  latencyMs?: number;
  selectedModel: string;
  models: string[];
  showSecret: boolean;
}

export function AISettingsClient() {
  const [activeProvider, setActiveProvider] = useState<string>("google");
  const [activeModel, setActiveModel] = useState<string>("gemini-2.0-flash");
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>(() => {
    const initial: Record<string, ProviderState> = {};
    for (const p of SUPPORTED_PROVIDERS) {
      initial[p] = {
        status: "disconnected",
        keyInput: "",
        urlInput: p === "9router-public" ? "" : undefined,
        validating: false,
        selectedModel: DEFAULT_AI_MODELS[p]?.[0] || "",
        models: DEFAULT_AI_MODELS[p] || [],
        showSecret: false,
      };
    }
    return initial;
  });

  // Load saved keys & catalog on mount
  useEffect(() => {
    const savedKeys = getAllKeys();
    const activeCfg = getActiveAiConfig();
    const public9r = get9RouterPublicConfig();

    setActiveProvider(activeCfg.provider);
    setActiveModel(activeCfg.model);

    // Fetch backend models catalog & local 9Router status
    const fetchCatalog = async () => {
      try {
        const res = await fetch("/api/ai/models");
        const json = await res.json();
        const catalogModels = json?.data?.providers || DEFAULT_AI_MODELS;
        const localStatus = json?.data?.status?.["9router"];

        setProviderStates((prev) => {
          const next = { ...prev };
          for (const p of SUPPORTED_PROVIDERS) {
            const savedKey = p === "9router-public" ? public9r.key : savedKeys[p] || "";
            const modelsList = catalogModels[p]?.length ? catalogModels[p] : DEFAULT_AI_MODELS[p] || [];
            const isConnectedLocal = p === "9router" && localStatus === "connected";

            next[p] = {
              status: isConnectedLocal ? "connected" : savedKey ? "saved" : "disconnected",
              keyInput: savedKey,
              urlInput: p === "9router-public" ? public9r.url : undefined,
              validating: false,
              selectedModel:
                p === activeCfg.provider
                  ? activeCfg.model
                  : p === "9router-public" && public9r.selectedModel
                  ? public9r.selectedModel
                  : modelsList[0] || "",
              models: modelsList,
              showSecret: false,
            };
          }
          return next;
        });
      } catch {
        // Fallback to local keys only
        setProviderStates((prev) => {
          const next = { ...prev };
          for (const p of SUPPORTED_PROVIDERS) {
            const savedKey = savedKeys[p] || "";
            next[p] = {
              ...next[p],
              status: savedKey ? "saved" : "disconnected",
              keyInput: savedKey,
            };
          }
          return next;
        });
      }
    };

    fetchCatalog();
  }, []);

  const handleKeyChange = (provider: string, val: string) => {
    setProviderStates((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        keyInput: val,
        status: val.trim() ? prev[provider].status : "disconnected",
      },
    }));
  };

  const handleUrlChange = (val: string) => {
    setProviderStates((prev) => ({
      ...prev,
      "9router-public": {
        ...prev["9router-public"],
        urlInput: val,
      },
    }));
  };

  const handleModelChange = (provider: string, model: string) => {
    setProviderStates((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        selectedModel: model,
      },
    }));

    if (provider === "9router-public") {
      const pub = get9RouterPublicConfig();
      set9RouterPublicConfig({ ...pub, selectedModel: model });
    }

    if (provider === activeProvider) {
      setActiveModel(model);
      setActiveAiConfig(provider, model);
      toast(`Default model set to ${model}`, "success");
    }
  };

  const handleSaveKey = (provider: string) => {
    const state = providerStates[provider];
    if (!state) return;

    if (provider === "9router-public") {
      set9RouterPublicConfig({
        url: state.urlInput || "",
        key: state.keyInput || "",
        models: state.models,
        selectedModel: state.selectedModel,
      });
      toast("Public router config saved", "success");
      setProviderStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], status: state.urlInput ? "saved" : "disconnected" },
      }));
      return;
    }

    if (state.keyInput.trim()) {
      setApiKey(provider, state.keyInput.trim());
      setProviderStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], status: "saved" },
      }));
      toast(`API key for ${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label || provider} saved`, "success");
    } else {
      removeApiKey(provider);
      setProviderStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], status: "disconnected" },
      }));
    }
  };

  const handleRemoveKey = (provider: string) => {
    if (provider === "9router-public") {
      set9RouterPublicConfig({ url: "", key: "", models: [], selectedModel: "" });
    } else {
      removeApiKey(provider);
    }

    setProviderStates((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        keyInput: "",
        urlInput: provider === "9router-public" ? "" : undefined,
        status: "disconnected",
        latencyMs: undefined,
      },
    }));
    toast(`Cleared credentials for ${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label || provider}`, "info");
  };

  const handleTestConnection = async (provider: string) => {
    const state = providerStates[provider];
    if (!state) return;

    setProviderStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], validating: true },
    }));
    setGeneralError(null);

    try {
      const res = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: state.keyInput,
          model: state.selectedModel,
          public_url: state.urlInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.message || "Failed to validate credentials");
      }

      // Automatically persist valid credentials
      if (provider === "9router-public") {
        set9RouterPublicConfig({
          url: state.urlInput || "",
          key: state.keyInput || "",
          models: data.models?.length ? data.models : state.models,
          selectedModel: state.selectedModel || data.models?.[0] || "",
        });
      } else if (state.keyInput.trim()) {
        setApiKey(provider, state.keyInput.trim());
      }

      setProviderStates((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          status: "connected",
          validating: false,
          latencyMs: data.latencyMs,
          models: data.models?.length ? data.models : prev[provider].models,
        },
      }));

      toast(data.message || `Connected to ${provider}`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Validation error";
      setProviderStates((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          status: "disconnected",
          validating: false,
          latencyMs: undefined,
        },
      }));
      toast(msg, "error");
    }
  };

  const handleSetActive = (provider: string) => {
    const state = providerStates[provider];
    const modelToUse = state?.selectedModel || DEFAULT_AI_MODELS[provider as SupportedProvider]?.[0] || "";
    setActiveProvider(provider);
    setActiveModel(modelToUse);
    setActiveAiConfig(provider, modelToUse);
    toast(`Active AI set to ${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label} (${modelToUse})`, "success");
  };

  return (
    <div className="w-full space-y-6">
      {/* Active AI Overview Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Robot size={24} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Active AI Provider</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle size={12} weight="bold" />
                Active in Aksora
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Currently powering Sicmundus task formatting, test generation, and QA tools:{" "}
              <strong className="text-slate-800">
                {AI_PROVIDER_LABELS[activeProvider as SupportedProvider]?.label || activeProvider}
              </strong>{" "}
              ({activeModel})
            </p>
          </div>
        </div>

        {/* Quick Active Provider Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={activeProvider}
            onChange={(e) => handleSetActive(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          >
            {SUPPORTED_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {AI_PROVIDER_LABELS[p]?.label}
              </option>
            ))}
          </select>

          {providerStates[activeProvider]?.models?.length > 0 && (
            <select
              value={activeModel}
              onChange={(e) => handleModelChange(activeProvider, e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            >
              {providerStates[activeProvider].models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {generalError && <InlineAlert variant="error" message={generalError} />}

      {/* Info Notice */}
      <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-xs text-sky-800">
        <p className="font-semibold text-sky-900">Privacy & Credential Security</p>
        <p className="mt-1 leading-relaxed text-sky-700">
          API keys are stored exclusively inside your browser&apos;s local storage (just like in SnapTest).
          Keys are sent per-request over HTTPS directly to the AI provider and are never committed to our backend database.
        </p>
      </div>

      {/* Provider List Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Providers</h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SUPPORTED_PROVIDERS.map((provider) => {
            const meta = AI_PROVIDER_LABELS[provider];
            const state = providerStates[provider];
            const isActive = activeProvider === provider;
            const isLocal = provider === "9router";
            const isPublicRouter = provider === "9router-public";

            return (
              <div
                key={provider}
                className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition ${
                  isActive
                    ? "border-purple-400 ring-2 ring-purple-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${meta.color}`}>
                        {isLocal ? <Cpu size={16} weight="bold" /> : isPublicRouter ? <Globe size={16} weight="bold" /> : provider.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{meta.label}</h4>
                          {isActive && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle size={12} weight="bold" />
                          Connected {state.latencyMs ? `(${state.latencyMs}ms)` : ""}
                        </span>
                      ) : state.status === "saved" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Key size={12} weight="bold" />
                          Key Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          <XCircle size={12} weight="bold" />
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="mt-4 space-y-3">
                    {/* For 9Router Public: Base URL field */}
                    {isPublicRouter && (
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Router Base URL
                        </label>
                        <input
                          type="text"
                          value={state.urlInput || ""}
                          onChange={(e) => handleUrlChange(e.target.value)}
                          placeholder="https://your-tunnel.example.com/v1"
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    )}

                    {/* API Key field */}
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        {isLocal ? "Local Token (Optional)" : isPublicRouter ? "Bearer Key (Optional)" : "API Key"}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={state.showSecret ? "text" : "password"}
                          value={state.keyInput}
                          onChange={(e) => handleKeyChange(provider, e.target.value)}
                          placeholder={meta.placeholder}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-9 font-mono text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProviderStates((prev) => ({
                              ...prev,
                              [provider]: { ...prev[provider], showSecret: !prev[provider].showSecret },
                            }))
                          }
                          className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                          title={state.showSecret ? "Hide secret" : "Show secret"}
                        >
                          {state.showSecret ? <EyeSlash size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Model Selector if available */}
                    {state.models.length > 0 && (
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Default Model
                        </label>
                        <select
                          value={state.selectedModel}
                          onChange={(e) => handleModelChange(provider, e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        >
                          {state.models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    {state.keyInput.trim() || isPublicRouter ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRemoveKey(provider)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          title="Remove credentials"
                        >
                          <Trash size={13} weight="bold" />
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveKey(provider)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Save key to browser storage"
                        >
                          <Key size={13} weight="bold" />
                          Save
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={state.validating}
                      onClick={() => handleTestConnection(provider)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ArrowsClockwise
                        size={13}
                        weight="bold"
                        className={state.validating ? "animate-spin text-purple-600" : ""}
                      />
                      {state.validating ? "Testing..." : "Test Connection"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetActive(provider)}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold shadow-sm transition ${
                        isActive
                          ? "bg-slate-100 text-slate-500 cursor-default"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      {isActive ? (
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
          })}
        </div>
      </div>
    </div>
  );
}
