import { describe, expect, it, vi, beforeEach } from "vitest";
import * as aiService from "@/lib/ai-service";
import {
  actionCheckDuplicateBugs,
  actionExportAutomation,
  actionDetectFlakyTests,
} from "@/lib/ai-qa-actions";

describe("ai-qa-actions", () => {
  const dummyAi = {
    provider: "google",
    model: "gemini-2.0-flash",
    apiKey: "test-key",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("actionCheckDuplicateBugs", () => {
    it("returns empty duplicates array early if no existing bugs exist", async () => {
      const callSpy = vi.spyOn(aiService, "callLLM");
      const res = await actionCheckDuplicateBugs(
        { title: "Crash on checkout", existingBugs: [] },
        dummyAi
      );
      expect(res).toEqual({ duplicates: [] });
      expect(callSpy).not.toHaveBeenCalled();
    });

    it("parses valid LLM duplicate suggestions", async () => {
      vi.spyOn(aiService, "callLLM").mockResolvedValue({
        content: JSON.stringify({
          duplicates: [
            {
              id: 42,
              title: "Payment timeout on checkout",
              similarityScore: 92,
              matchReason: "Same error stack trace on payment submit",
            },
          ],
        }),
        provider: "google",
        model: "gemini-2.0-flash",
        totalTokens: 100,
      });

      const res = await actionCheckDuplicateBugs(
        {
          title: "Crash on checkout button click",
          existingBugs: [
            { id: 42, title: "Payment timeout on checkout", status: "Open" },
          ],
        },
        dummyAi
      );

      expect(res.duplicates).toHaveLength(1);
      expect(res.duplicates[0].id).toBe(42);
      expect(res.duplicates[0].similarityScore).toBe(92);
    });

    it("throws when both title and rawText are empty", async () => {
      await expect(
        actionCheckDuplicateBugs({ title: "" }, dummyAi)
      ).rejects.toThrow("Title or description is required");
    });
  });

  describe("actionExportAutomation", () => {
    it("returns generated TypeScript script from LLM", async () => {
      const mockScript = "import { test, expect } from '@playwright/test';\ntest('login', async ({ page }) => {});";
      vi.spyOn(aiService, "callLLM").mockResolvedValue({
        content: JSON.stringify({
          code: mockScript,
          fileName: "test-login.spec.ts",
          notes: "Run with npx playwright test",
        }),
        provider: "google",
        model: "gemini-2.0-flash",
        totalTokens: 120,
      });

      const res = await actionExportAutomation(
        {
          framework: "playwright",
          caseName: "Valid Login",
          testStep: "1. Open login\n2. Enter credentials\n3. Click submit",
          expectedResult: "Redirected to dashboard",
        },
        dummyAi
      );

      expect(res.fileName).toBe("test-login.spec.ts");
      expect(res.code).toContain("import { test, expect }");
    });
  });

  describe("actionDetectFlakyTests", () => {
    it("returns empty flakiness list if history array is empty", async () => {
      const res = await actionDetectFlakyTests({ history: [] }, dummyAi);
      expect(res).toEqual({ suspects: [] });
    });
  });
});
