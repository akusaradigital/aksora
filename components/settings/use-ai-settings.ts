"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import {
  getAllKeys,
  setApiKey,
  removeApiKey,
  getActiveAiConfig,
  setActiveAiConfig,
  get9RouterPublicConfig,
  set9RouterPublicConfig,
  getStoredProviderModels,
  setStoredProviderModels,
} from "@/lib/ai-keys";
import {
  SUPPORTED_PROVIDERS,
  DEFAULT_AI_MODELS,
  AI_PROVIDER_LABELS,
  type SupportedProvider,
} from "@/lib/ai-service";
import type { ProviderCardState } from "./ai-provider-card";

export function useAISettings() {
  const [activeProvider, setActiveProvider] = useState<string>("");
  const [activeModel, setActiveModel] = useState<string>("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [customModelMode, setCustomModelMode] = useState<Record<string, boolean>>({});

  const [providerStates, setProviderStates] = useState<Record<string, ProviderCardState>>(() => {
    const initial: Record<string, ProviderCardState> = {};
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
    const storedCachedModels = getStoredProviderModels();

    const fetchCatalog = async () => {
      try {
        const res = await fetch("/api/ai/models");
        const json = await res.json();
        const catalogModels = json?.data?.providers || DEFAULT_AI_MODELS;
        const localStatus = json?.data?.status?.["9router"];

        let resolvedActive = activeCfg.provider;
        let resolvedModel = activeCfg.model;

        const activeHasKey =
          resolvedActive === "9router"
            ? localStatus === "connected"
            : resolvedActive === "9router-public"
            ? Boolean(public9r.url)
            : Boolean(savedKeys[resolvedActive]);

        if (!activeHasKey) {
          const firstConfigured = SUPPORTED_PROVIDERS.find((p) => {
            if (p === "9router") return localStatus === "connected";
            if (p === "9router-public") return Boolean(public9r.url);
            return Boolean(savedKeys[p]);
          });
          resolvedActive = firstConfigured || "";
        }

        setProviderStates((prev) => {
          const next = { ...prev };
          for (const p of SUPPORTED_PROVIDERS) {
            const savedKey = p === "9router-public" ? public9r.key : savedKeys[p] || "";
            const modelsList =
              storedCachedModels[p]?.length
                ? storedCachedModels[p]
                : catalogModels[p]?.length
                ? catalogModels[p]
                : DEFAULT_AI_MODELS[p] || [];
            const isConnectedLocal = p === "9router" && localStatus === "connected";

            const defaultForP =
              p === resolvedActive && resolvedModel
                ? resolvedModel
                : p === "9router-public" && public9r.selectedModel
                ? public9r.selectedModel
                : modelsList[0] || "";

            next[p] = {
              status: isConnectedLocal ? "connected" : savedKey ? "saved" : "disconnected",
              keyInput: savedKey,
              urlInput: p === "9router-public" ? public9r.url : undefined,
              validating: false,
              selectedModel: defaultForP,
              models: modelsList,
              showSecret: false,
            };

            if (p === resolvedActive) {
              resolvedModel = defaultForP;
            }
          }
          return next;
        });

        setActiveProvider(resolvedActive);
        setActiveModel(resolvedModel);
        if (resolvedActive) {
          setActiveAiConfig(resolvedActive, resolvedModel);
        }
      } catch {
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
      if (activeProvider === provider) {
        setActiveProvider("");
        setActiveModel("");
        setActiveAiConfig("", "");
      }
    }
  };

  const handleRemoveKey = (provider: string) => {
    if (provider === "9router-public") {
      set9RouterPublicConfig({ url: "", key: "", models: [], selectedModel: "" });
    } else {
      removeApiKey(provider);
    }

    if (activeProvider === provider) {
      setActiveProvider("");
      setActiveModel("");
      setActiveAiConfig("", "");
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

  const handleFetchModels = async (provider: string) => {
    const state = providerStates[provider];
    if (!state) return;

    setFetchingModels((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_key: state.keyInput,
          public_url: state.urlInput,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to fetch models from provider");
      }

      const liveModels: string[] = json?.data?.models || [];
      if (liveModels.length > 0) {
        setStoredProviderModels(provider, liveModels);
        setProviderStates((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            models: liveModels,
            selectedModel: liveModels.includes(prev[provider].selectedModel)
              ? prev[provider].selectedModel
              : liveModels[0] || prev[provider].selectedModel,
          },
        }));

        if (provider === activeProvider && !liveModels.includes(activeModel)) {
          setActiveModel(liveModels[0] || "");
          setActiveAiConfig(provider, liveModels[0] || "");
        }

        toast(
          `Fetched ${liveModels.length} models from ${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label}`,
          "success"
        );
      } else {
        toast("No models returned by provider API", "info");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to fetch models", "error");
    } finally {
      setFetchingModels((prev) => ({ ...prev, [provider]: false }));
    }
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

      const updatedModels = data.models?.length ? data.models : state.models;
      const latency = typeof data.latencyMs === "number" ? data.latencyMs : undefined;

      setProviderStates((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          validating: false,
          status: "connected",
          latencyMs: latency,
          models: updatedModels,
          selectedModel: updatedModels.includes(prev[provider].selectedModel)
            ? prev[provider].selectedModel
            : updatedModels[0] || prev[provider].selectedModel,
        },
      }));

      if (!activeProvider) {
        const modelToSet = updatedModels[0] || state.selectedModel;
        setActiveProvider(provider);
        setActiveModel(modelToSet);
        setActiveAiConfig(provider, modelToSet);
        toast(`Connected & activated ${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label}`, "success");
      } else {
        toast(
          `Connected to ${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label}${latency ? ` (${latency}ms)` : ""}`,
          "success"
        );
      }
    } catch (err) {
      setProviderStates((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          validating: false,
          status: "disconnected",
          latencyMs: undefined,
        },
      }));

      const msg = err instanceof Error ? err.message : "Validation failed";
      setGeneralError(`[${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label}] ${msg}`);
      toast(msg, "error");
    }
  };

  const handleSetActive = (provider: string) => {
    const state = providerStates[provider];
    const isConfigured = state?.status === "connected" || state?.status === "saved";
    if (!isConfigured) {
      toast("Please enter and save a valid API key before activating this provider", "error");
      return;
    }

    const modelToUse = state?.selectedModel || state?.models?.[0] || "";
    setActiveProvider(provider);
    setActiveModel(modelToUse);
    setActiveAiConfig(provider, modelToUse);
    toast(`Active AI set to ${AI_PROVIDER_LABELS[provider as SupportedProvider]?.label} (${modelToUse})`, "success");
  };

  const toggleShowSecret = (provider: string) => {
    setProviderStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], showSecret: !prev[provider].showSecret },
    }));
  };

  const toggleCustomModelMode = (provider: string) => {
    setCustomModelMode((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const isCurrentActiveConfigured =
    Boolean(activeProvider) &&
    (providerStates[activeProvider]?.status === "connected" ||
      providerStates[activeProvider]?.status === "saved");

  return {
    activeProvider,
    activeModel,
    generalError,
    fetchingModels,
    customModelMode,
    providerStates,
    isCurrentActiveConfigured,
    handleKeyChange,
    handleUrlChange,
    handleModelChange,
    handleSaveKey,
    handleRemoveKey,
    handleFetchModels,
    handleTestConnection,
    handleSetActive,
    toggleShowSecret,
    toggleCustomModelMode,
  };
}
