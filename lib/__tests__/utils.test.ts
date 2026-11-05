import { describe, expect, it } from "vitest";
import { cn, codeFromId, formatDate, formatDisplayText, normalizeMultiline, toDateInput, parseTimeToMinutes, calculateDurationFromTime, addMinutesToTime, normalizeTimeString } from "@/lib/utils";

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

  it("parses time strings to minutes and calculates durations", () => {
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("8:30")).toBe(510);
    expect(parseTimeToMinutes("02:00")).toBe(120);
    expect(parseTimeToMinutes("2026-11-04T08:30:00.000Z")).toBe(510);
    expect(parseTimeToMinutes("")).toBeUndefined();
    expect(parseTimeToMinutes(null)).toBeUndefined();
    expect(normalizeTimeString("8:30")).toBe("08:30");
    expect(normalizeTimeString("08:30")).toBe("08:30");
    expect(normalizeTimeString("2026-11-04T08:30:00.000Z")).toBe("08:30");
    expect(normalizeTimeString("")).toBe("");
    expect(calculateDurationFromTime("08:30", "10:40")).toBe(130);
    expect(addMinutesToTime("08:30", 130)).toBe("10:40");
  });
});
