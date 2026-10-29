import { callLLM } from "@/lib/ai-service";

export interface ActionAiContext {
  provider: string;
  model: string;
  apiKey: string;
  publicUrl?: string;
}

export function parseJsonSafe<T>(content: string, fallback: T): T {
  if (!content) return fallback;
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // continue
      }
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        // continue
      }
    }
    const firstBracket = trimmed.indexOf("[");
    const lastBracket = trimmed.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
      } catch {
        // continue
      }
    }
    return fallback;
  }
}

// 1. Check duplicate bugs
export async function actionCheckDuplicateBugs(
  payload: { title: string; rawText?: string; existingBugs?: Array<{ id: number; title: string; status: string; project?: string }> },
  ai: ActionAiContext
) {
  const { title, rawText, existingBugs = [] } = payload;
  if (!title && !rawText) throw new Error("Title or description is required for duplicate check");
  if (existingBugs.length === 0) return { duplicates: [] };

  const systemPrompt = `You are a QA Triage Specialist. Analyze a new incoming bug draft against a list of existing open bugs.
Detect semantic duplicates or highly related tickets.
Respond ONLY with valid JSON in this structure:
{
  "duplicates": [
    {
      "id": 123,
      "title": "Existing bug title",
      "similarityScore": 85, // 0 to 100
      "matchReason": "Both describe payment gateway 504 timeout on mobile checkout"
    }
  ]
}`;

  const candidatesText = existingBugs
    .slice(0, 30)
    .map((b) => `#${b.id}: ${b.title} [Status: ${b.status}, Project: ${b.project || "General"}]`)
    .join("\n");

  const userPrompt = `New Bug Draft:\nTitle: ${title}\nDetails: ${rawText || "-"}\n\nExisting Open Bugs:\n${candidatesText}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 1200,
  });

  const parsed = parseJsonSafe<{
    duplicates?: Array<{
      id: number;
      title: string;
      similarityScore: number;
      matchReason: string;
    }>;
  }>(res.content, { duplicates: [] });
  const duplicates = (parsed.duplicates || []).filter((d) => (d.similarityScore || 0) >= 60);
  return { duplicates };
}

// 2. Export test case to Playwright / Cypress automation code
export async function actionExportAutomation(
  payload: { caseName: string; preCondition?: string; testStep: string; expectedResult: string; framework?: "playwright" | "cypress" },
  ai: ActionAiContext
) {
  const { caseName, preCondition, testStep, expectedResult, framework = "playwright" } = payload;
  if (!caseName) throw new Error("Case name is required");

  const systemPrompt = `You are a Principal Test Automation Engineer.
Convert manual test case instructions into production-ready, clean TypeScript ${framework === "cypress" ? "Cypress" : "Playwright"} automated test code.
Include proper imports, test block, meaningful comments, data-testid locators with sensible fallbacks, and expect assertions.
Respond ONLY with valid JSON:
{
  "code": "// Complete executable script in ${framework === "cypress" ? "Cypress" : "Playwright"}",
  "fileName": "test-${framework === "cypress" ? "spec.cy.ts" : "spec.ts"}",
  "notes": "Short bullet instructions to run"
}`;

  const userPrompt = `Test Case: ${caseName}\nPreconditions: ${preCondition || "None"}\nSteps:\n${testStep}\nExpected Result: ${expectedResult}\nTarget Framework: ${framework}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 2500,
  });

  return parseJsonSafe(res.content, {
    code: `// Test for ${caseName}\n// Error generating automated code`,
    fileName: `test-${framework === "cypress" ? "spec.cy.ts" : "spec.ts"}`,
    notes: "Review manual test steps",
  });
}

// 3. Assemble Targeted Smoke Suite from changelog/PR notes
export async function actionAssembleSmokeSuite(
  payload: { changelog: string; availableCases: Array<{ id: number; tcId?: string; caseName: string; typeCase?: string }> },
  ai: ActionAiContext
) {
  const { changelog, availableCases = [] } = payload;
  if (!changelog.trim()) throw new Error("Changelog or PR description is required");

  const casesList = availableCases
    .slice(0, 100)
    .map((c) => `[ID:${c.id}] ${c.tcId || ""}: ${c.caseName} (${c.typeCase || "functional"})`)
    .join("\n");

  const systemPrompt = `You are a QA Lead assembling a minimal high-risk Smoke Test Suite for a deployment.
Given the change description, select the top 5 to 15 most critical test cases that must be verified.
Respond ONLY with valid JSON:
{
  "selectedIds": [1, 2, 3],
  "reasoning": "Explanation of risk surface and why these were selected",
  "estimatedMinutes": 25
}`;

  const userPrompt = `Changes / Release Diff:\n${changelog}\n\nAvailable Test Cases:\n${casesList}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 1500,
  });

  return parseJsonSafe(res.content, {
    selectedIds: availableCases.slice(0, 5).map((c) => c.id),
    reasoning: "Selected top baseline test cases",
    estimatedMinutes: 20,
  });
}

// 4. Developer Root Cause & Code Hint Assistant
export async function actionAnalyzeRootCause(
  payload: { title: string; steps?: string; actualResult?: string; errorLog?: string; project?: string },
  ai: ActionAiContext
) {
  const { title, steps, actualResult, errorLog, project } = payload;
  if (!title && !errorLog) throw new Error("Bug title or error log is required");

  const systemPrompt = `You are a Senior Fullstack Architect assisting developers and QA in triaging bugs.
Analyze the defect, logs, and symptoms. Provide a structured technical hypothesis to accelerate debugging.
Respond ONLY with valid JSON:
{
  "hypothesis": "Clear explanation of what likely failed in the stack",
  "suspectedFiles": ["e.g. lib/auth.ts", "components/checkout/payment-form.tsx"],
  "reproTip": "Key condition or payload that triggers the issue",
  "suggestedFix": "Code snippet or architectural adjustment advice"
}`;

  const userPrompt = `Project: ${project || "Web Application"}\nTitle: ${title}\nSteps: ${steps || "None"}\nActual Result: ${actualResult || "None"}\nError Log/Trace: ${errorLog || "None"}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 1800,
  });

  return parseJsonSafe(res.content, {
    hypothesis: "Investigation needed based on logs and symptoms.",
    suspectedFiles: [],
    reproTip: "Check request payload and state transitions.",
    suggestedFix: "Inspect backend logs and client network tab for details.",
  });
}

// 5. Daily Standup & QA Progress Digest
export async function actionGenerateStandup(
  payload: { runsSummary?: string; bugsSummary?: string; testerName?: string },
  ai: ActionAiContext
) {
  const { runsSummary = "", bugsSummary = "", testerName = "QA Tester" } = payload;

  const systemPrompt = `You are a QA Engineer preparing your daily standup update for Slack/Teams.
Create a crisp, professional update with three sections:
- Yesterday (what was tested, runs completed, bugs verified)
- Today (planned test execution, regression runs)
- Blockers (critical bugs, environment issues, missing specs)
Respond ONLY with valid JSON:
{
  "markdown": "Formatted standup text ready to copy-paste",
  "headline": "One-line summary for morning call"
}`;

  const userPrompt = `Tester: ${testerName}\nRecent Runs & Executions:\n${runsSummary || "Various functional regression runs executed"}\nRecent Bugs Logged / Closed:\n${bugsSummary || "Logged UI defects, verified resolved tickets"}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 1200,
  });

  return parseJsonSafe(res.content, {
    markdown: `**Yesterday:** Executed test runs and verified defects.\n**Today:** Continuing test coverage and regression checks.\n**Blockers:** None currently.`,
    headline: "QA execution and regression on schedule",
  });
}

// 6. Screenshot & Error Image Analyzer (OCR + Visual Bug)
export async function actionAnalyzeScreenshot(
  payload: { imageBase64: string; mimeType?: string; additionalContext?: string },
  ai: ActionAiContext
) {
  const { imageBase64, mimeType = "image/png", additionalContext = "" } = payload;
  if (!imageBase64) throw new Error("Screenshot image is required");

  const systemPrompt = `You are a QA Vision Specialist.
Analyze the provided screenshot (error modal, console log, UI layout glitch, or mobile crash).
Extract all visible error messages, identify visual defects, and structure into a complete bug ticket.
Respond ONLY with valid JSON:
{
  "extractedText": "Any text or error codes extracted from screenshot",
  "title": "Clear concise bug title (e.g. [Billing] Payment dialog displays 500 Internal Server Error)",
  "stepsToReproduce": "1. Open view seen in screenshot\\n2. Observe state",
  "expectedResult": "Expected clean visual/system behavior",
  "actualResult": "Defect observed in screenshot",
  "suggestedSeverity": "Major" // Critical | Major | Minor | Low
}`;

  const userPrompt = `Analyze this QA screenshot and structure the bug report. Additional context: ${additionalContext || "None"}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    imageBase64,
    mimeType,
    jsonMode: true,
    maxTokens: 1500,
  });

  return parseJsonSafe(res.content, {
    extractedText: "",
    title: "Defect observed in attached screenshot",
    stepsToReproduce: "1. Open view seen in screenshot\n2. Observe error state",
    expectedResult: "Normal operational view without errors",
    actualResult: "Error captured in attached screenshot",
    suggestedSeverity: "Major",
  });
}

// 7. Flaky Test Detector
export async function actionDetectFlakyTests(
  payload: { history: Array<{ testCaseId: number; tcId?: string; caseName: string; verdicts: string[] }> },
  ai: ActionAiContext
) {
  const { history = [] } = payload;
  if (history.length === 0) return { suspects: [] };

  const historyText = history
    .map((h) => `[ID:${h.testCaseId}] ${h.tcId || ""}: ${h.caseName} -> Runs: [${h.verdicts.join(", ")}]`)
    .join("\n");

  const systemPrompt = `You are a QA Reliability Engineer.
Analyze recent execution runs per test case. Flag tests that alternate repeatedly between Passed and Failed/Blocked across consecutive runs with high variance (flaky tests).
Respond ONLY with valid JSON:
{
  "suspects": [
    {
      "testCaseId": 12,
      "tcId": "TC-012",
      "caseName": "Name",
      "flakinessRate": 60, // percentage of state flips
      "reason": "Alternates Pass and Fail over 4 consecutive runs without code changes",
      "recommendation": "Quarantine" // Quarantine | Investigate | Monitor
    }
  ]
}`;

  const userPrompt = `Execution Run History:\n${historyText}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 1500,
  });

  return parseJsonSafe(res.content, { suspects: [] });
}

// 8. Release Notes & Changelog Generator
export async function actionGenerateReleaseNotes(
  payload: { releaseVersion?: string; closedBugs: Array<{ id: number; title: string; severity?: string }>; completedTasks: Array<{ id: number; title: string; category?: string }> },
  ai: ActionAiContext
) {
  const { releaseVersion = "v1.0.0", closedBugs = [], completedTasks = [] } = payload;

  const bugsText = closedBugs.map((b) => `- [BUG-${b.id}] ${b.title} (${b.severity || "Normal"})`).join("\n");
  const tasksText = completedTasks.map((t) => `- [TASK-${t.id}] ${t.title} [${t.category || "Feature"}]`).join("\n");

  const systemPrompt = `You are a Technical Product Lead preparing release notes for release ${releaseVersion}.
Generate two distinct sections:
1. User-Facing Highlights: Customer-friendly language celebrating new features and improvements.
2. Engineering & QA Changelog: Technical details of features merged, bug fixes, and stability updates.
Respond ONLY with valid JSON:
{
  "version": "${releaseVersion}",
  "userFacing": "Markdown formatted user announcement",
  "technicalChangelog": "Markdown formatted engineering changelog",
  "highlights": ["3 to 5 key bullet takeaways"]
}`;

  const userPrompt = `Release: ${releaseVersion}\n\nResolved Bugs:\n${bugsText || "None"}\n\nCompleted Tasks:\n${tasksText || "None"}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 2500,
  });

  return parseJsonSafe(res.content, {
    version: releaseVersion,
    userFacing: `Release ${releaseVersion} updates and performance improvements.`,
    technicalChangelog: `Resolved ${closedBugs.length} bugs and closed ${completedTasks.length} tasks.`,
    highlights: ["Quality stability improvements", "Defect resolutions"],
  });
}

// 9. Natural Language QA Copilot Query
export async function actionQaCopilotQuery(
  payload: { query: string; contextData?: string },
  ai: ActionAiContext
) {
  const { query, contextData = "" } = payload;
  if (!query.trim()) throw new Error("Query is required");

  const systemPrompt = `You are Aksora QA Copilot, an intelligent workspace assistant for QA and engineering teams.
Answer questions directly and concisely based on the workspace context. Suggest actionable filters or next steps.
Respond ONLY with valid JSON:
{
  "answer": "Direct concise answer in markdown",
  "suggestedModule": "bugs" | "test-cases" | "test-sessions" | "test-plans" | "tasks" | null,
  "suggestedFilter": {
    "key": "severity",
    "value": "Critical"
  } // or null
}`;

  const userPrompt = `Workspace Context:\n${contextData || "Active QA workspace with test cases, bugs, and sessions."}\n\nUser Question:\n${query}`;

  const res = await callLLM({
    provider: ai.provider,
    model: ai.model,
    apiKey: ai.apiKey,
    publicBaseUrl: ai.publicUrl,
    systemPrompt,
    userPrompt,
    jsonMode: true,
    maxTokens: 1500,
  });

  return parseJsonSafe(res.content, {
    answer: "I couldn't process this query against the current workspace data.",
    suggestedModule: null,
    suggestedFilter: null,
  });
}
