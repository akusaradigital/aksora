import { callLLM, DEFAULT_AI_MODELS, type SupportedProvider } from "@/lib/ai-service";
import { parseJsonSafe } from "@/lib/ai-qa-actions";

export const TRIAGE_TIERS = ["P0", "P1", "P2", "P3"] as const;
export type TriageTier = (typeof TRIAGE_TIERS)[number];

export type TriageResult = {
  tier: TriageTier;
  confidence: number;
  reasoning: string;
  suggestedSeverity: string;
};

export type TriageAi = { provider?: string; model?: string; apiKey?: string; publicUrl?: string };

const SEVERITIES = ["Critical", "High", "Medium", "Low"];

const SYSTEM_PROMPT = `You are a senior QA triage lead. Assign a release priority tier to a bug report.
Tiers:
- P0: blocks release or production down, data loss, security hole, no workaround.
- P1: core flow broken for many users, workaround is painful.
- P2: feature partly broken or limited users affected, workaround exists.
- P3: cosmetic, copy, minor UX.
Respond ONLY with JSON, no prose or code fences:
{"tier":"P0|P1|P2|P3","confidence":0-100,"reasoning":"one or two short sentences","suggestedSeverity":"Critical|High|Medium|Low"}`;

/** Coerces whatever the model returns into a valid TriageResult. */
export function normalizeTriage(raw: Partial<Record<keyof TriageResult, unknown>>): TriageResult {
  const tier = String(raw.tier ?? "").toUpperCase().trim();
  const conf = Math.round(Number(raw.confidence));
  const sev = SEVERITIES.find((s) => s.toLowerCase() === String(raw.suggestedSeverity ?? "").toLowerCase().trim());
  return {
    tier: (TRIAGE_TIERS as readonly string[]).includes(tier) ? (tier as TriageTier) : "P2",
    confidence: Number.isFinite(conf) ? Math.min(100, Math.max(0, conf)) : 0,
    reasoning: String(raw.reasoning ?? "").slice(0, 2000),
    suggestedSeverity: sev || "Medium",
  };
}

export async function triageBug(
  bug: { title: string; project?: string; stepsToReproduce?: string; expectedResult?: string; actualResult?: string; evidence?: string; severity?: string },
  ai: TriageAi,
  usage: { workspaceId: number | null; userId: number | null },
): Promise<TriageResult> {
  const provider = (ai.provider || "9router").toLowerCase().trim();
  const model = ai.model || DEFAULT_AI_MODELS[provider as SupportedProvider]?.[0] || "gemini-2.0-flash";
  const userPrompt = [
    `Title: ${bug.title}`,
    `Project: ${bug.project || "-"}`,
    `Reported severity: ${bug.severity || "-"}`,
    `Steps to reproduce:\n${bug.stepsToReproduce || "-"}`,
    `Expected result:\n${bug.expectedResult || "-"}`,
    `Actual result:\n${bug.actualResult || "-"}`,
    bug.evidence ? `Evidence notes:\n${String(bug.evidence).slice(0, 4000)}` : "",
  ].filter(Boolean).join("\n\n");

  const res = await callLLM({
    provider,
    model,
    apiKey: ai.apiKey || "",
    publicBaseUrl: ai.publicUrl || "",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    jsonMode: true,
    usage: { feature: "bug_triage", workspaceId: usage.workspaceId, userId: usage.userId },
  });
  return normalizeTriage(parseJsonSafe<Record<string, unknown>>(res.content, {}));
}
