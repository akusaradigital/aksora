// Client-safe: no server imports. Used by the run dialog to flag models Midscene cannot drive.

/** Midscene needs an OpenAI-compatible endpoint plus a model family to parse coordinates. */
export function inferModelFamily(model: string): string {
  const m = model.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/gemini/, "gemini"],
    [/gpt-6/, "gpt-6"],
    [/gpt-5/, "gpt-5"],
    [/qwen3\.6/, "qwen3.6"],
    [/qwen3\.5/, "qwen3.5"],
    [/qwen3-vl|qwen3vl/, "qwen3-vl"],
    [/qwen2\.5-vl|qwen-vl/, "qwen2.5-vl"],
    [/ui-tars/, "vlm-ui-tars-doubao-1.5"],
    [/doubao-seed/, "doubao-seed"],
    [/doubao/, "doubao-vision"],
    [/autoglm|auto-glm/, "auto-glm"],
    [/glm/, "glm-v"],
    [/kimi/, "kimi"],
    [/mimo/, "xiaomi-mimo"],
    [/deepseek/, "deepseek"],
  ];
  return rules.find(([re]) => re.test(m))?.[1] ?? "";
}

export function midsceneBaseUrl(provider: string, publicUrl?: string): string {
  switch (provider) {
    case "google": return "https://generativelanguage.googleapis.com/v1beta/openai/";
    case "openai": return "https://api.openai.com/v1";
    case "anthropic": return "https://api.anthropic.com/v1/";
    case "groq": return "https://api.groq.com/openai/v1";
    case "deepseek": return "https://api.deepseek.com/v1";
    case "9router": return "http://127.0.0.1:20128/v1";
    case "9router-public": return `${String(publicUrl || "").replace(/\/v1\/?$/, "").replace(/\/$/, "")}/v1`;
    default: return "";
  }
}
