/**
 * Universal AI service for Aksora.
 * Supports Google Gemini, Anthropic Claude, OpenAI, Groq, DeepSeek, and 9Router (Local/Public).
 * Designed for task formatting, QA generation, and intelligent assistant workflows.
 */

import {
  SUPPORTED_PROVIDERS,
  DEFAULT_AI_MODELS,
  AI_PROVIDER_LABELS,
  type SupportedProvider,
  type CallLLMOptions,
  type CallLLMResult,
} from "./ai-types";

export {
  SUPPORTED_PROVIDERS,
  DEFAULT_AI_MODELS,
  AI_PROVIDER_LABELS,
  type SupportedProvider,
  type CallLLMOptions,
  type CallLLMResult,
};

const PROVIDER_TIMEOUT_MS = 45_000;

function normalizeProvider(provider: string): SupportedProvider {
  const p = (provider || "").toLowerCase().trim();
  if (SUPPORTED_PROVIDERS.includes(p as SupportedProvider)) {
    return p as SupportedProvider;
  }
  return "google";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`AI request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resilient multi-format model extractor for OpenAI-compatible proxies (such as 9Router).
 * Handles:
 * - OpenAI standard format: { data: [{ id: "model-name" }] }
 * - Array of strings in data: { data: ["model-name-1", "model-name-2"] }
 * - Models key format: { models: [{ id: "..." }] } or { models: ["..."] }
 * - Items key format: { items: [{ id: "..." }] }
 * - Direct root array of objects: [{ id: "model-name" }]
 * - Direct root array of strings: ["model-name-1", "model-name-2"]
 */
export function extractModelsFromPayload(data: unknown): string[] {
  if (!data) return [];

  // 1. Direct array at root
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "id" in item) {
          const id = (item as { id: unknown }).id;
          return typeof id === "string" ? id.trim() : "";
        }
        return "";
      })
      .filter(Boolean);
  }

  // 2. Object with enveloped arrays (.data, .models, or .items)
  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    const rawList = Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.models)
      ? record.models
      : Array.isArray(record.items)
      ? record.items
      : null;

    if (rawList) {
      return rawList
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object" && "id" in item) {
            const id = (item as { id: unknown }).id;
            return typeof id === "string" ? id.trim() : "";
          }
          return "";
        })
        .filter(Boolean);
    }
  }

  return [];
}

/**
 * Resilient discovery for local 9Router instance.
 * Checks IPv4 (127.0.0.1) and localhost (IPv6/IPv4), /v1/models and /models.
 */
export async function queryLocal9Router(
  apiKey?: string,
  timeoutMs = 2500
): Promise<{ connected: boolean; models: string[] }> {
  const endpoints = [
    "http://127.0.0.1:20128/v1/models",
    "http://localhost:20128/v1/models",
    "http://127.0.0.1:20128/models",
    "http://localhost:20128/models",
  ];

  const headers: Record<string, string> = {};
  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithTimeout(endpoint, { headers }, timeoutMs);
      if (res.ok) {
        const json = await res.json();
        const models = extractModelsFromPayload(json);
        return {
          connected: true,
          models: models.length > 0 ? models : DEFAULT_AI_MODELS["9router"],
        };
      }
    } catch {
      // Continue to next local candidate endpoint
    }
  }

  return { connected: false, models: [] };
}

/**
 * Resilient discovery for public/tunneled 9Router instances.
 */
export async function queryPublic9Router(
  publicUrl: string,
  apiKey?: string,
  timeoutMs = 8000
): Promise<{ connected: boolean; models: string[]; error?: string }> {
  const cleanUrl = publicUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
  const candidates = [
    `${cleanUrl}/v1/models`,
    `${cleanUrl}/models`,
  ];

  const headers: Record<string, string> = {};
  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  let lastError = "";
  for (const endpoint of candidates) {
    try {
      const res = await fetchWithTimeout(endpoint, { headers }, timeoutMs);
      if (res.ok) {
        const json = await res.json();
        const models = extractModelsFromPayload(json);
        return {
          connected: true,
          models: models.length > 0 ? models : DEFAULT_AI_MODELS["9router-public"],
        };
      }
      lastError = `Endpoint returned HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
    }
  }

  return { connected: false, models: [], error: lastError };
}

/**
 * Dynamically fetch available models directly from provider API.
 * Returns official models from provider if key is provided and valid, otherwise fallback list.
 */
export async function fetchProviderModels(
  provider: string,
  apiKey?: string,
  publicUrl?: string
): Promise<string[]> {
  const p = normalizeProvider(provider);
  const cleanKey = (apiKey || "").trim();

  try {
    if (p === "google") {
      if (!cleanKey) return DEFAULT_AI_MODELS.google;
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
      const res = await fetchWithTimeout(url, { method: "GET" }, 8_000);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models)) {
          const list = data.models
            .filter((m: { supportedGenerationMethods?: string[] }) =>
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes("generateContent")
            )
            .map((m: { name?: string }) => (m.name || "").replace(/^models\//, ""))
            .filter(Boolean);
          if (list.length > 0) return list;
        }
      }
    } else if (p === "openai") {
      if (!cleanKey) return DEFAULT_AI_MODELS.openai;
      const res = await fetchWithTimeout(
        "https://api.openai.com/v1/models",
        { headers: { Authorization: `Bearer ${cleanKey}` } },
        8_000
      );
      if (res.ok) {
        const data = await res.json();
        const models = extractModelsFromPayload(data);
        if (models.length > 0) {
          const chatRegex = /^(gpt-[34]|o[13]|chatgpt)/i;
          const excludeRegex = /(audio|realtime|transcription|tts|embedding|moderation|dall-e|instruct)/i;
          const filtered = models
            .filter((id: string) => chatRegex.test(id) && !excludeRegex.test(id))
            .sort();
          if (filtered.length > 0) return filtered;
        }
      }
    } else if (p === "anthropic") {
      if (!cleanKey) return DEFAULT_AI_MODELS.anthropic;
      const res = await fetchWithTimeout(
        "https://api.anthropic.com/v1/models",
        {
          headers: {
            "x-api-key": cleanKey,
            "anthropic-version": "2023-06-01",
          },
        },
        8_000
      );
      if (res.ok) {
        const data = await res.json();
        const models = extractModelsFromPayload(data);
        if (models.length > 0) return models;
      }
    } else if (p === "groq") {
      if (!cleanKey) return DEFAULT_AI_MODELS.groq;
      const res = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/models",
        { headers: { Authorization: `Bearer ${cleanKey}` } },
        8_000
      );
      if (res.ok) {
        const data = await res.json();
        const models = extractModelsFromPayload(data);
        if (models.length > 0) {
          const filtered = models.filter((id) => !id.includes("whisper"));
          if (filtered.length > 0) return filtered;
        }
      }
    } else if (p === "deepseek") {
      if (!cleanKey) return DEFAULT_AI_MODELS.deepseek;
      const res = await fetchWithTimeout(
        "https://api.deepseek.com/models",
        { headers: { Authorization: `Bearer ${cleanKey}` } },
        8_000
      );
      if (res.ok) {
        const data = await res.json();
        const models = extractModelsFromPayload(data);
        if (models.length > 0) return models;
      }
    } else if (p === "9router") {
      const result = await queryLocal9Router(cleanKey, 3_000);
      if (result.connected && result.models.length > 0) {
        return result.models;
      }
    } else if (p === "9router-public" && publicUrl) {
      const result = await queryPublic9Router(publicUrl, cleanKey, 8_000);
      if (result.connected && result.models.length > 0) {
        return result.models;
      }
    }
  } catch {
    // Return fallback on network error
  }

  return DEFAULT_AI_MODELS[p] || [];
}

/**
 * Execute universal LLM call across any configured provider.
 */
export async function callLLM(opts: CallLLMOptions): Promise<CallLLMResult> {
  const p = normalizeProvider(opts.provider);
  const model = opts.model || DEFAULT_AI_MODELS[p]?.[0] || "gemini-2.0-flash";
  const apiKey = (opts.apiKey || "").trim();
  const maxTokens = opts.maxTokens || 2048;

  // 1. Google Gemini
  if (p === "google") {
    if (!apiKey) throw new Error("Google Gemini API key is required");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const fullText = opts.systemPrompt ? `${opts.systemPrompt}\n\n${opts.userPrompt}` : opts.userPrompt;

    const parts: Array<Record<string, unknown>> = [{ text: fullText }];
    if (opts.imageBase64) {
      const rawBase64 = opts.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      parts.push({
        inline_data: {
          mime_type: opts.mimeType || "image/png",
          data: rawBase64,
        },
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
        ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Google Gemini request failed (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("No response generated by Google Gemini");
    }

    return {
      content: candidateText.trim(),
      provider: p,
      model,
      totalTokens: data.usageMetadata?.totalTokenCount,
    };
  }

  // 2. Anthropic Claude
  if (p === "anthropic") {
    if (!apiKey) throw new Error("Anthropic API key is required");
    const url = "https://api.anthropic.com/v1/messages";

    let systemText = opts.systemPrompt || "";
    if (opts.jsonMode) {
      systemText += " Output strictly valid JSON. Do not include markdown codeblocks or extra prose.";
    }

    let userContent: unknown = opts.userPrompt;
    if (opts.imageBase64) {
      const rawBase64 = opts.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      userContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: opts.mimeType || "image/png",
            data: rawBase64,
          },
        },
        { type: "text", text: opts.userPrompt },
      ];
    }

    const payload = {
      model,
      max_tokens: maxTokens,
      system: systemText,
      messages: [{ role: "user", content: userContent }],
      temperature: 0.2,
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic request failed (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error("No response generated by Anthropic Claude");
    }

    const totalTokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    return {
      content: text.trim(),
      provider: p,
      model,
      totalTokens,
    };
  }

  // 3. OpenAI-compatible providers: OpenAI, Groq, DeepSeek, 9Router, 9Router-Public
  let baseURL = "https://api.openai.com/v1/chat/completions";
  switch (p) {
    case "openai":
      baseURL = "https://api.openai.com/v1/chat/completions";
      break;
    case "groq":
      baseURL = "https://api.groq.com/openai/v1/chat/completions";
      break;
    case "deepseek":
      baseURL = "https://api.deepseek.com/v1/chat/completions";
      break;
    case "9router":
      baseURL = "http://127.0.0.1:20128/v1/chat/completions";
      break;
    case "9router-public": {
      const pubUrl = (opts.publicBaseUrl || "").replace(/\/v1\/?$/, "").replace(/\/$/, "");
      if (!pubUrl) throw new Error("Public 9Router URL is not configured");
      baseURL = `${pubUrl}/v1/chat/completions`;
      break;
    }
  }

  if (p !== "9router" && p !== "9router-public" && !apiKey) {
    throw new Error(`API key is required for ${p}`);
  }

  const effectiveKey = p === "9router" && !apiKey ? "9router-local-key" : apiKey;

  const messages: Array<{ role: "system" | "user"; content: unknown }> = [];
  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  if (opts.imageBase64) {
    const imgUrl = opts.imageBase64.startsWith("data:")
      ? opts.imageBase64
      : `data:${opts.mimeType || "image/png"};base64,${opts.imageBase64}`;
    messages.push({
      role: "user",
      content: [
        { type: "text", text: opts.userPrompt },
        { type: "image_url", image_url: { url: imgUrl } },
      ],
    });
  } else {
    messages.push({ role: "user", content: opts.userPrompt });
  }

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
  };

  if (opts.jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (effectiveKey) {
    headers.Authorization = `Bearer ${effectiveKey}`;
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(baseURL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (p === "9router" && baseURL.includes("127.0.0.1")) {
      const fallbackUrl = baseURL.replace("127.0.0.1", "localhost");
      res = await fetchWithTimeout(fallbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${p} request failed (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`No choices returned from ${p}`);
  }

  return {
    content: content.trim(),
    provider: p,
    model: data.model || model,
    totalTokens: data.usage?.total_tokens,
  };
}
