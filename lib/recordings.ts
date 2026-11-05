import { z } from "zod";
import { db } from "@/lib/db";
import { callLLM } from "@/lib/ai-service";
import { parseJsonSafe, MIDSCENE_YAML_RULES } from "@/lib/ai-qa-actions";
import { validateMidsceneYaml } from "@/lib/ai-runner";

export const recordingEventSchema = z.object({
  type: z.enum(["click", "input", "change", "submit", "navigation", "keydown"]),
  target: z.string().max(500).default(""),
  value: z.string().max(2000).optional(),
  url: z.string().max(2000).default(""),
  ts: z.number().default(0),
});
export type RecordingEvent = z.infer<typeof recordingEventSchema>;

export const createRecordingSchema = z.object({
  title: z.string().trim().min(1).max(200).default("Untitled recording"),
  startUrl: z.string().max(2000).default(""),
  events: z.array(recordingEventSchema).min(1, "The recording has no steps").max(500),
});

/** Scope for both session and API-key users: workspace when known, else the creating user. */
export function recordingScope(user: { id?: number | null; activeWorkspaceId?: number | null }) {
  return user.activeWorkspaceId
    ? { sql: '"workspaceId" = ?', param: user.activeWorkspaceId as number }
    : { sql: '"workspaceId" IS NULL AND "userId" = ?', param: Number(user.id) || 0 };
}

export function eventsToText(events: RecordingEvent[]): string {
  return events
    .map((e, i) => {
      const where = e.target ? ` "${e.target}"` : "";
      if (e.type === "navigation") return `${i + 1}. Page loaded: ${e.url}`;
      if (e.type === "input" || e.type === "change") return `${i + 1}. Typed into${where}: ${e.value ?? ""}`;
      if (e.type === "keydown") return `${i + 1}. Pressed ${e.value ?? "a key"}${where ? ` in${where}` : ""}`;
      return `${i + 1}. ${e.type === "submit" ? "Submitted form" : "Clicked"}${where}`;
    })
    .join("\n");
}

export async function recordingToCase(
  rec: { title: string; startUrl: string; events: RecordingEvent[] },
  ai: { provider: string; model: string; apiKey: string; publicUrl?: string },
  usage: { workspaceId: number | null; userId: number | null },
) {
  const systemPrompt = `You turn a browser recording into one manual test case plus a Midscene YAML script.
Infer the user's goal from the events. Write numbered steps a tester can follow. The expected result is what should be visible at the end.
Replace typed passwords, emails and other personal data with {{variable}} placeholders (e.g. {{username}}, {{password}}).
Use the start URL only to infer the path: the script url must be "{{baseUrl}}" plus that path.
${MIDSCENE_YAML_RULES}
Respond ONLY with JSON:
{ "caseName": "...", "preCondition": "...", "testStep": "1. ...\\n2. ...", "expectedResult": "...", "typeCase": "Positive", "priority": "Medium", "automationScript": "<YAML>" }`;
  const userPrompt = `Recording title: ${rec.title}\nStart URL: ${rec.startUrl}\n\nEvents:\n${eventsToText(rec.events)}`;
  const res = await callLLM({
    provider: ai.provider, model: ai.model, apiKey: ai.apiKey, publicBaseUrl: ai.publicUrl,
    systemPrompt, userPrompt, jsonMode: true, maxTokens: 3000,
    usage: { feature: "recording_to_case", ...usage },
  });
  const out = parseJsonSafe<Record<string, string>>(res.content, {});
  if (!out.caseName || !out.testStep || !out.expectedResult) throw new Error("The model did not return a usable test case. Try again or pick another model.");
  const script = String(out.automationScript || "").trim();
  return {
    caseName: String(out.caseName).slice(0, 300),
    preCondition: String(out.preCondition || ""),
    testStep: String(out.testStep),
    expectedResult: String(out.expectedResult),
    typeCase: out.typeCase === "Negative" ? "Negative" : "Positive",
    priority: ["Critical", "High", "Medium", "Low"].includes(out.priority) ? out.priority : "Medium",
    // Keep the case even if the script is malformed; the script can be regenerated on the case.
    automationScript: script && !validateMidsceneYaml(script) ? script : "",
  };
}

/** Next TC-### id for a suite, following the existing tcId convention. */
export async function nextTcId(suiteId: number) {
  const rows = await db.query<{ tcId: string }>(
    `SELECT "tcId" FROM "TestCase" WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL`,
    [suiteId],
  );
  const max = rows.reduce((m, r) => Math.max(m, Number(/(\d+)\s*$/.exec(r.tcId || "")?.[1]) || 0), 0);
  return `TC-${String(max + 1).padStart(3, "0")}`;
}
