import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callLLM, DEFAULT_AI_MODELS, type SupportedProvider } from "@/lib/ai-service";
import {
  actionCheckDuplicateBugs,
  actionExportAutomation,
  actionAssembleSmokeSuite,
  actionAnalyzeRootCause,
  actionGenerateStandup,
  actionAnalyzeScreenshot,
  actionDetectFlakyTests,
  actionGenerateReleaseNotes,
  actionQaCopilotQuery,
  parseJsonSafe,
} from "@/lib/ai-qa-actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      action: string;
      payload: Record<string, unknown>;
      ai?: {
        provider?: string;
        model?: string;
        apiKey?: string;
        publicUrl?: string;
      };
    };

    if (!body || !body.action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const ai = body.ai || {};
    const provider = (ai.provider || "9router").toLowerCase().trim();
    const model = ai.model || DEFAULT_AI_MODELS[provider as SupportedProvider]?.[0] || "gemini-2.0-flash";
    const apiKey = ai.apiKey || "";
    const publicBaseUrl = ai.publicUrl || "";

    // 1. Action: Generate Test Cases from User Story / Spec
    if (body.action === "generate_cases") {
      const story = String(body.payload?.story || "").trim();
      const featureName = String(body.payload?.featureName || "").trim();
      if (!story) {
        return NextResponse.json({ error: "User story / spec is required" }, { status: 400 });
      }

      const systemPrompt = `You are an expert QA Lead engineer.
Analyze the user story or requirement specification and generate 4 to 8 comprehensive test cases.
Cover positive flow, negative flow, boundary conditions, and edge cases.

Respond ONLY with valid JSON in this exact structure with no extra prose or markdown code fences:
{
  "testCases": [
    {
      "caseName": "Brief descriptive title (e.g., Valid login with correct credentials)",
      "preCondition": "Prerequisites needed before test",
      "testStep": "1. Step one\\n2. Step two\\n3. Step three",
      "expectedResult": "Expected outcome",
      "typeCase": "functional", // functional | negative | boundary | security
      "priority": "high" // high | medium | low
    }
  ]
}`;

      const userPrompt = `Feature Name: ${featureName || "General"}\n\nUser Story / Specification:\n${story}`;

      const res = await callLLM({
        provider,
        model,
        apiKey,
        publicBaseUrl,
        systemPrompt,
        userPrompt,
        jsonMode: true,
        maxTokens: 2500,
      });

      const parsed = parseJsonSafe<{ testCases: unknown[] }>(res.content, { testCases: [] });

      return NextResponse.json({
        data: {
          testCases: parsed.testCases || [],
          provider,
          model,
        },
      });
    }

    // 2. Action: Auto-Standardize Bug Report
    if (body.action === "enhance_bug") {
      const rawText = String(body.payload?.rawText || "").trim();
      const currentTitle = String(body.payload?.title || "").trim();
      if (!rawText && !currentTitle) {
        return NextResponse.json({ error: "Bug description or title is required" }, { status: 400 });
      }

      const systemPrompt = `You are a Senior QA Specialist.
Transform rough, informal bug notes into a standardized, professional engineering bug report.

Respond ONLY with valid JSON in this exact structure with no extra markdown:
{
  "title": "Clear concise bug title (e.g., [Checkout] Payment button unclickable in Safari mobile)",
  "stepsToReproduce": "1. Navigate to ...\\n2. Click on ...\\n3. Observe ...",
  "expectedResult": "What should happen according to specs",
  "actualResult": "What actually failed or occurred",
  "suspectedCause": "Brief technical hypothesis (e.g., flexbox overflow or state update timing)",
  "suggestedSeverity": "Major" // Critical | Major | Minor | Low
}`;

      const userPrompt = `Title draft: ${currentTitle || "Untitled"}\n\nNotes from QA:\n${rawText || currentTitle}`;

      const res = await callLLM({
        provider,
        model,
        apiKey,
        publicBaseUrl,
        systemPrompt,
        userPrompt,
        jsonMode: true,
        maxTokens: 1500,
      });

      const parsed = parseJsonSafe(res.content, {
        title: currentTitle || "Untitled Bug Report",
        stepsToReproduce: rawText || "Steps to be determined",
        expectedResult: "Normal operational behavior",
        actualResult: rawText || "Defect occurred",
        suspectedCause: "Under investigation",
        suggestedSeverity: "Major",
      });

      return NextResponse.json({ data: { enhanced: parsed, provider, model } });
    }

    // 3. Action: Convert Bug to Regression Test Case
    if (body.action === "bug_to_case") {
      const bugTitle = String(body.payload?.bugTitle || "").trim();
      const actualResult = String(body.payload?.actualResult || "").trim();
      const expectedResult = String(body.payload?.expectedResult || "").trim();
      const fixSummary = String(body.payload?.fixSummary || "").trim();

      if (!bugTitle) {
        return NextResponse.json({ error: "Bug title is required" }, { status: 400 });
      }

      const systemPrompt = `You are a QA Automation & Regression engineer.
Given a resolved bug and its fix context, design a regression test case to verify that this bug never recurs in future releases.

Respond ONLY with valid JSON in this exact structure with no extra prose:
{
  "caseName": "[Regression] Verify fix: ${bugTitle}",
  "preCondition": "Setup and state needed to test this fix",
  "testStep": "1. Navigate to ...\\n2. Perform action that previously triggered the defect\\n3. Verify response",
  "expectedResult": "Expected behavior confirming defect is absent",
  "typeCase": "regression",
  "priority": "high"
}`;

      const userPrompt = `Bug: ${bugTitle}\nPrevious Defect: ${actualResult || "Bug occurred"}\nExpected Behavior: ${expectedResult || "Normal operation"}\nFix Notes: ${fixSummary || "Resolved by developer"}`;

      const res = await callLLM({
        provider,
        model,
        apiKey,
        publicBaseUrl,
        systemPrompt,
        userPrompt,
        jsonMode: true,
        maxTokens: 1200,
      });

      const parsed = parseJsonSafe(res.content, {
        caseName: `[Regression] Verify fix: ${bugTitle}`,
        preCondition: "System deployed with latest fix",
        testStep: "1. Navigate to view\n2. Perform action\n3. Verify no defect occurs",
        expectedResult: expectedResult || "Defect does not reproduce",
        typeCase: "regression",
        priority: "high",
      });

      return NextResponse.json({ data: { testCase: parsed, provider, model } });
    }

    // 4. Action: QA Test Session Executive Summary
    if (body.action === "session_summary") {
      const sessionTitle = String(body.payload?.sessionTitle || "QA Test Session").trim();
      const total = Number(body.payload?.totalCases || 0);
      const passed = Number(body.payload?.passed || 0);
      const failed = Number(body.payload?.failed || 0);
      const blocked = Number(body.payload?.blocked || 0);
      const failedSummary = String(body.payload?.failedSummary || "").trim();

      const systemPrompt = `You are a QA Director preparing an executive release decision summary for Engineering & Product leaders.
Analyze the test execution numbers and failed defects, then provide a structured release report.

Respond ONLY with valid JSON in this exact structure with no extra prose:
{
  "verdict": "GO", // GO | NO_GO | CAUTION
  "headline": "One sentence verdict headline",
  "executiveSummary": "2-3 concise paragraphs covering: test coverage & pass rate, critical blockers and user impact, and final release recommendation.",
  "keyRisks": ["Risk bullet 1", "Risk bullet 2"]
}`;

      const userPrompt = `Test Session: ${sessionTitle}\nMetrics: Total=${total}, Passed=${passed}, Failed=${failed}, Blocked=${blocked}\nPass Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%\n\nFailed Defects Summary:\n${failedSummary || "None specified"}`;

      const res = await callLLM({
        provider,
        model,
        apiKey,
        publicBaseUrl,
        systemPrompt,
        userPrompt,
        jsonMode: true,
        maxTokens: 2000,
      });

      const parsed = parseJsonSafe(res.content, {
        verdict: failed > 0 ? "CAUTION" : "GO",
        headline: `${sessionTitle} executed with ${passed}/${total} passed cases.`,
        executiveSummary: `Test session completed with ${passed} passed and ${failed} failed cases. Review critical findings before production sign-off.`,
        keyRisks: failedSummary ? [failedSummary.slice(0, 100)] : [],
      });

      return NextResponse.json({ data: { report: parsed, provider, model } });
    }

    const aiCtx = { provider, model, apiKey, publicUrl: publicBaseUrl };

    // 5. Action: Duplicate Bug Detector
    if (body.action === "check_duplicate_bugs") {
      const data = await actionCheckDuplicateBugs(body.payload as unknown as Parameters<typeof actionCheckDuplicateBugs>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 6. Action: Export Test Automation Script (Playwright / Cypress)
    if (body.action === "export_automation") {
      const data = await actionExportAutomation(body.payload as unknown as Parameters<typeof actionExportAutomation>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 7. Action: Assemble Targeted Smoke Suite
    if (body.action === "assemble_smoke_suite") {
      const data = await actionAssembleSmokeSuite(body.payload as unknown as Parameters<typeof actionAssembleSmokeSuite>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 8. Action: Developer Root Cause & Code Hint
    if (body.action === "analyze_root_cause") {
      const data = await actionAnalyzeRootCause(body.payload as unknown as Parameters<typeof actionAnalyzeRootCause>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 9. Action: Daily Standup & QA Progress Digest
    if (body.action === "generate_standup") {
      const data = await actionGenerateStandup(body.payload as unknown as Parameters<typeof actionGenerateStandup>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 10. Action: Screenshot & Error Image OCR Analyzer
    if (body.action === "analyze_screenshot") {
      const data = await actionAnalyzeScreenshot(body.payload as unknown as Parameters<typeof actionAnalyzeScreenshot>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 11. Action: Detect Flaky Tests
    if (body.action === "detect_flaky_tests") {
      const data = await actionDetectFlakyTests(body.payload as unknown as Parameters<typeof actionDetectFlakyTests>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 12. Action: Release Notes & Changelog Generator
    if (body.action === "generate_release_notes") {
      const data = await actionGenerateReleaseNotes(body.payload as unknown as Parameters<typeof actionGenerateReleaseNotes>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    // 13. Action: Natural Language QA Copilot Query
    if (body.action === "qa_copilot_query") {
      const data = await actionQaCopilotQuery(body.payload as unknown as Parameters<typeof actionQaCopilotQuery>[0], aiCtx);
      return NextResponse.json({ data: { ...data, provider, model } });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI Agent execution failed" },
      { status: 500 }
    );
  }
}
