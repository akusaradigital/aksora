/**
 * Client-side AI API Key and Provider Storage.
 * Keys are kept securely in browser localStorage only - never committed to backend DB.
 * Persists reliably across sessions until explicitly disconnected by the user.
 */

const STORAGE_KEYS = "aksora_ai_keys";
const STORAGE_ACTIVE = "aksora_ai_active";
const STORAGE_9ROUTER_PUBLIC = "aksora_9router_public";
const STORAGE_MODELS_CACHE = "aksora_ai_models_cache";

interface StoredKeyEntry {
  key: string;
}

type RawStorage = Record<string, string | StoredKeyEntry>;

function readRawKeys(): RawStorage {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS) || "{}");
  } catch {
    return {};
  }
}

function getValidKeyMap(): Record<string, string> {
  const raw = readRawKeys();
  const validMap: Record<string, string> = {};

  for (const [provider, val] of Object.entries(raw)) {
    if (typeof val === "string") {
      if (val.trim()) validMap[provider] = val.trim();
    } else if (val && typeof val === "object" && val.key) {
      if (val.key.trim()) validMap[provider] = val.key.trim();
    }
  }

  return validMap;
}

export function getApiKey(provider: string): string {
  if (provider === "9router-public") {
    return get9RouterPublicConfig().key;
  }
  const map = getValidKeyMap();
  return map[provider] || "";
}

export function getAllKeys(): Record<string, string> {
  return getValidKeyMap();
}

export function setApiKey(provider: string, key: string): void {
  if (typeof window === "undefined") return;
  const raw = readRawKeys();
  const updated: Record<string, StoredKeyEntry> = {};

  for (const [p, val] of Object.entries(raw)) {
    if (p === provider) continue;
    const k = typeof val === "string" ? val : val?.key;
    if (k && k.trim()) {
      updated[p] = { key: k.trim() };
    }
  }

  if (key.trim()) {
    updated[provider] = {
      key: key.trim(),
    };
  }

  localStorage.setItem(STORAGE_KEYS, JSON.stringify(updated));
}

export function removeApiKey(provider: string): void {
  if (typeof window === "undefined") return;
  const raw = readRawKeys();
  const updated: Record<string, StoredKeyEntry> = {};

  for (const [p, val] of Object.entries(raw)) {
    if (p === provider) continue;
    const k = typeof val === "string" ? val : val?.key;
    if (k && k.trim()) {
      updated[p] = { key: k.trim() };
    }
  }

  localStorage.setItem(STORAGE_KEYS, JSON.stringify(updated));
}

export function isAiConfigured(): boolean {
  if (typeof window === "undefined") return false;
  const config = getActiveAiConfig();
  if (!config.provider) return false;
  if (config.provider === "9router") return true;
  if (config.provider === "9router-public") {
    const pub = get9RouterPublicConfig();
    return Boolean(pub.url);
  }
  return Boolean(getApiKey(config.provider));
}

export function getActiveAiConfig(): { provider: string; model: string } {
  if (typeof window === "undefined") {
    return { provider: "", model: "" };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_ACTIVE) || "{}");
    return {
      provider: typeof saved.provider === "string" ? saved.provider : "",
      model: typeof saved.model === "string" ? saved.model : "",
    };
  } catch {
    return { provider: "", model: "" };
  }
}

export function getActiveAiCredentials(): {
  provider: string;
  model: string;
  apiKey: string;
  publicUrl?: string;
} {
  const cfg = getActiveAiConfig();
  if (!cfg.provider) return { provider: "", model: "", apiKey: "" };

  if (cfg.provider === "9router-public") {
    const pub = get9RouterPublicConfig();
    return {
      provider: "9router-public",
      model: cfg.model || pub.selectedModel,
      apiKey: pub.key,
      publicUrl: pub.url,
    };
  }

  return {
    provider: cfg.provider,
    model: cfg.model,
    apiKey: getApiKey(cfg.provider),
  };
}

export function setActiveAiConfig(provider: string, model: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_ACTIVE, JSON.stringify({ provider, model }));
}

export function getStoredProviderModels(): Record<string, string[]>;
export function getStoredProviderModels(provider: string): string[];
export function getStoredProviderModels(provider?: string): Record<string, string[]> | string[] {
  if (typeof window === "undefined") return provider ? [] : {};
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_MODELS_CACHE) || "{}");
    if (provider) {
      return Array.isArray(all[provider]) ? all[provider] : [];
    }
    return all;
  } catch {
    return provider ? [] : {};
  }
}

export function setStoredProviderModels(provider: string, models: string[]): void {
  if (typeof window === "undefined" || !provider) return;
  const current = getStoredProviderModels();
  current[provider] = models;
  localStorage.setItem(STORAGE_MODELS_CACHE, JSON.stringify(current));
}

export function get9RouterPublicConfig(): {
  url: string;
  key: string;
  models: string[];
  selectedModel: string;
} {
  if (typeof window === "undefined") {
    return { url: "", key: "", models: [], selectedModel: "" };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_9ROUTER_PUBLIC) || "{}");
    return {
      url: typeof saved.url === "string" ? saved.url : "",
      key: typeof saved.key === "string" ? saved.key : "",
      models: Array.isArray(saved.models) ? saved.models : [],
      selectedModel: typeof saved.selectedModel === "string" ? saved.selectedModel : "",
    };
  } catch {
    return { url: "", key: "", models: [], selectedModel: "" };
  }
}

export function set9RouterPublicConfig(config: {
  url: string;
  key: string;
  models?: string[];
  selectedModel?: string;
}): void {
  if (typeof window === "undefined") return;
  const current = get9RouterPublicConfig();
  localStorage.setItem(
    STORAGE_9ROUTER_PUBLIC,
    JSON.stringify({
      url: config.url.trim(),
      key: config.key.trim(),
      models: config.models ?? current.models,
      selectedModel: config.selectedModel ?? current.selectedModel,
    })
  );
}

/**
 * Returns complete AI request bundle to pass to API routes.
 */
export function getAiRequestPayload(): {
  ai_provider: string;
  ai_model: string;
  api_key: string;
  nine_router_public_url: string;
} {
  const active = getActiveAiConfig();
  const provider = active.provider;
  const publicCfg = provider === "9router-public" ? get9RouterPublicConfig() : null;
  const resolvedModel =
    provider === "9router-public" && publicCfg?.selectedModel ? publicCfg.selectedModel : active.model;

  return {
    ai_provider: provider,
    ai_model: resolvedModel,
    api_key: getApiKey(provider),
    nine_router_public_url: publicCfg?.url || "",
  };
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
