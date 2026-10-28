import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/ai-service", () => ({
  callLLM: vi.fn(),
  DEFAULT_AI_MODELS: {
    google: ["gemini-2.0-flash"],
    "9router": ["gemini-2.0-flash"],
  },
}));

import { getCurrentUser } from "@/lib/auth";
import { callLLM } from "@/lib/ai-service";

describe("QA AI Agent API (/api/ai/qa-agent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/ai/qa-agent", {
      method: "POST",
      body: JSON.stringify({ action: "generate_cases", payload: { story: "Test story" } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  const mockUser = { id: 1, email: "qa@example.com" } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;

  it("returns 400 when action is missing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    const req = new Request("http://localhost/api/ai/qa-agent", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("handles action: generate_cases successfully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(callLLM).mockResolvedValue({
      content: JSON.stringify({
        testCases: [
          {
            caseName: "Valid Login",
            preCondition: "User exists",
            testStep: "1. Enter email\n2. Enter password\n3. Click Login",
            expectedResult: "Redirected to dashboard",
            typeCase: "functional",
            priority: "high",
          },
        ],
      }),
      provider: "9router",
      model: "gemini-2.0-flash",
    });

    const req = new Request("http://localhost/api/ai/qa-agent", {
      method: "POST",
      body: JSON.stringify({
        action: "generate_cases",
        payload: { story: "Login with valid credentials", featureName: "Auth" },
        ai: { provider: "9router" },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.testCases).toHaveLength(1);
    expect(json.data.testCases[0].caseName).toBe("Valid Login");
  });

  it("handles action: enhance_bug successfully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(callLLM).mockResolvedValue({
      content: JSON.stringify({
        title: "[Auth] Login button fails to trigger on Safari mobile",
        stepsToReproduce: "1. Open Safari\n2. Tap login",
        expectedResult: "Form submits",
        actualResult: "No response",
        suspectedCause: "Touch event listener passive flag",
        suggestedSeverity: "Major",
      }),
      provider: "9router",
      model: "gemini-2.0-flash",
    });

    const req = new Request("http://localhost/api/ai/qa-agent", {
      method: "POST",
      body: JSON.stringify({
        action: "enhance_bug",
        payload: { title: "login broken on phone" },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.enhanced.title).toContain("[Auth]");
    expect(json.data.enhanced.suggestedSeverity).toBe("Major");
  });

  it("handles action: bug_to_case successfully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(callLLM).mockResolvedValue({
      content: JSON.stringify({
        caseName: "[Regression] Verify fix: Login button responsive",
        preCondition: "Fix deployed to staging",
        testStep: "1. Navigate to /login\n2. Click login button",
        expectedResult: "Submission succeeds without freeze",
        typeCase: "regression",
        priority: "high",
      }),
      provider: "9router",
      model: "gemini-2.0-flash",
    });

    const req = new Request("http://localhost/api/ai/qa-agent", {
      method: "POST",
      body: JSON.stringify({
        action: "bug_to_case",
        payload: { bugTitle: "Login button unresponsive" },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.testCase.typeCase).toBe("regression");
    expect(json.data.testCase.caseName).toContain("[Regression]");
  });

  it("handles action: session_summary successfully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(callLLM).mockResolvedValue({
      content: JSON.stringify({
        verdict: "GO",
        headline: "Sprint 42 Release Candidate passed with 95% test coverage",
        executiveSummary: "All critical regression and functional test cases have succeeded.",
        keyRisks: ["Minor cosmetic bug on dark mode toggle"],
      }),
      provider: "9router",
      model: "gemini-2.0-flash",
    });

    const req = new Request("http://localhost/api/ai/qa-agent", {
      method: "POST",
      body: JSON.stringify({
        action: "session_summary",
        payload: {
          sessionTitle: "Sprint 42 RC",
          totalCases: 20,
          passed: 19,
          failed: 1,
          blocked: 0,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.report.verdict).toBe("GO");
    expect(json.data.report.keyRisks).toHaveLength(1);
  });
});
