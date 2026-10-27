/**
 * Client-side AI API Key and Provider Storage.
 * Keys are kept securely in browser localStorage only - never committed to backend DB.
 * Stored with 14-day rolling TTL to prevent stale credential buildup.
 */

const STORAGE_KEYS = "aksora_ai_keys";
const STORAGE_ACTIVE = "aksora_ai_active";
const STORAGE_9ROUTER_PUBLIC = "aksora_9router_public";
const KEY_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface StoredKeyEntry {
  key: string;
  expiresAt: number;
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

function cleanExpiredKeys(): Record<string, string> {
  const raw = readRawKeys();
  const now = Date.now();
  const validMap: Record<string, string> = {};
  let changed = false;

  for (const [provider, val] of Object.entries(raw)) {
    if (typeof val === "string") {
      validMap[provider] = val;
    } else if (val && typeof val === "object" && val.key) {
      if (val.expiresAt && now > val.expiresAt) {
        changed = true;
      } else {
        validMap[provider] = val.key;
      }
    }
  }

  if (changed && typeof window !== "undefined") {
    const cleanStorage: Record<string, StoredKeyEntry> = {};
    for (const [p, k] of Object.entries(validMap)) {
      cleanStorage[p] = { key: k, expiresAt: now + KEY_TTL_MS };
    }
    localStorage.setItem(STORAGE_KEYS, JSON.stringify(cleanStorage));
  }

  return validMap;
}

export function getApiKey(provider: string): string {
  if (provider === "9router-public") {
    return get9RouterPublicConfig().key;
  }
  const map = cleanExpiredKeys();
  return map[provider] || "";
}

export function getAllKeys(): Record<string, string> {
  return cleanExpiredKeys();
}

export function setApiKey(provider: string, key: string): void {
  if (typeof window === "undefined") return;
  const raw = readRawKeys();
  const now = Date.now();
  const updated: Record<string, StoredKeyEntry> = {};

  for (const [p, val] of Object.entries(raw)) {
    if (p === provider) continue;
    const k = typeof val === "string" ? val : val?.key;
    const exp = typeof val === "object" && val?.expiresAt ? val.expiresAt : now + KEY_TTL_MS;
    if (k && now <= exp) {
      updated[p] = { key: k, expiresAt: exp };
    }
  }

  if (key.trim()) {
    updated[provider] = {
      key: key.trim(),
      expiresAt: now + KEY_TTL_MS,
    };
  }

  localStorage.setItem(STORAGE_KEYS, JSON.stringify(updated));
}

export function removeApiKey(provider: string): void {
  if (typeof window === "undefined") return;
  const raw = readRawKeys();
  const now = Date.now();
  const updated: Record<string, StoredKeyEntry> = {};

  for (const [p, val] of Object.entries(raw)) {
    if (p === provider) continue;
    const k = typeof val === "string" ? val : val?.key;
    const exp = typeof val === "object" && val?.expiresAt ? val.expiresAt : now + KEY_TTL_MS;
    if (k && now <= exp) {
      updated[p] = { key: k, expiresAt: exp };
    }
  }

  localStorage.setItem(STORAGE_KEYS, JSON.stringify(updated));
}

export function getActiveAiConfig(): { provider: string; model: string } {
  if (typeof window === "undefined") {
    return { provider: "google", model: "gemini-2.0-flash" };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_ACTIVE) || "{}");
    return {
      provider: saved.provider || "google",
      model: saved.model || "gemini-2.0-flash",
    };
  } catch {
    return { provider: "google", model: "gemini-2.0-flash" };
  }
}

export function setActiveAiConfig(provider: string, model: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_ACTIVE, JSON.stringify({ provider, model }));
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
