import { describe, expect, it } from "vitest";
import { cn, codeFromId, formatDate, formatDisplayText, normalizeMultiline, toDateInput } from "@/lib/utils";

describe("utils", () => {
  it("joins class values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("formats dates and handles invalid values", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("2026-04-30")).toContain("2026");
  });

  it("converts dates to input format", () => {
    expect(toDateInput(null)).toBe("");
    expect(toDateInput("not-a-date")).toBe("");
    expect(toDateInput("2026-04-30 12:34:56")).toBe("2026-04-30");
  });

  it("normalizes multiline text", () => {
    expect(normalizeMultiline(" line 1\r\nline 2 \n")).toBe("line 1\nline 2");
  });

  it("formats display text consistently", () => {
    expect(formatDisplayText("todo")).toBe("Todo");
    expect(formatDisplayText("in_progress")).toBe("In Progress");
    expect(formatDisplayText("QA Engineer")).toBe("QA Engineer");
    expect(formatDisplayText("TestCase")).toBe("Test Case");
    expect(formatDisplayText("UI/UX Designer")).toBe("UI/UX Designer");
  });

  it("generates stable codes", () => {
    expect(codeFromId("BUG", 7)).toBe("BUG-007");
  });
});
