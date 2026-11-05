import { describe, expect, it } from "vitest";
import { findClosestCase, titleSimilarity } from "../case-similarity";

describe("titleSimilarity", () => {
  it("scores identical titles as 1 regardless of case and punctuation", () => {
    expect(titleSimilarity("Valid login with correct credentials", "valid LOGIN, correct credentials!")).toBe(1);
  });

  it("scores unrelated titles as 0", () => {
    expect(titleSimilarity("Reset password via OTP", "Export invoice PDF")).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(titleSimilarity("", "Login")).toBe(0);
  });
});

describe("findClosestCase", () => {
  it("picks the most similar existing case", () => {
    const existing = [{ caseName: "Export invoice PDF" }, { caseName: "Login fails with wrong password" }];
    const result = findClosestCase("Login with wrong password shows error", existing);
    expect(result?.match.caseName).toBe("Login fails with wrong password");
    expect(result!.score).toBeGreaterThan(0.3);
  });

  it("returns null when nothing overlaps", () => {
    expect(findClosestCase("Reset password", [{ caseName: "Export invoice" }])).toBeNull();
  });
});
