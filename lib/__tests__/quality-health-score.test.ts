import { describe, expect, it } from "vitest";
import { computeQualityHealthScore, clamp, computeResolutionRate } from "@/lib/data-dashboard";

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to min when value is below", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("clamps to max when value is above", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("returns min when value equals min", () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it("returns max when value equals max", () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

describe("computeQualityHealthScore", () => {
  it("computes correct score with all components present", () => {
    // 0.4 * 80 + 0.3 * 90 + 0.3 * 70 = 32 + 27 + 21 = 80
    expect(computeQualityHealthScore(80, 90, 70)).toBe(80);
  });

  it("treats null inputs as 0", () => {
    // 0.4 * 0 + 0.3 * 0 + 0.3 * 0 = 0
    expect(computeQualityHealthScore(null, null, null)).toBe(0);
  });

  it("treats individual null as 0", () => {
    // 0.4 * 100 + 0.3 * 0 + 0.3 * 100 = 40 + 0 + 30 = 70
    expect(computeQualityHealthScore(100, null, 100)).toBe(70);
  });

  it("clamps values above 100", () => {
    // 0.4 * 100 + 0.3 * 100 + 0.3 * 100 = 40 + 30 + 30 = 100
    expect(computeQualityHealthScore(200, 150, 120)).toBe(100);
  });

  it("clamps negative values to 0", () => {
    // 0.4 * 0 + 0.3 * 0 + 0.3 * 0 = 0
    expect(computeQualityHealthScore(-50, -20, -10)).toBe(0);
  });

  it("always returns an integer (floors the result)", () => {
    // 0.4 * 33 + 0.3 * 33 + 0.3 * 33 = 13.2 + 9.9 + 9.9 = 33
    expect(computeQualityHealthScore(33, 33, 33)).toBe(33);
    // 0.4 * 99 + 0.3 * 99 + 0.3 * 99 = 39.6 + 29.7 + 29.7 = 99
    expect(computeQualityHealthScore(99, 99, 99)).toBe(99);
  });

  it("result is always in [0, 100]", () => {
    expect(computeQualityHealthScore(0, 0, 0)).toBeGreaterThanOrEqual(0);
    expect(computeQualityHealthScore(0, 0, 0)).toBeLessThanOrEqual(100);
    expect(computeQualityHealthScore(100, 100, 100)).toBeGreaterThanOrEqual(0);
    expect(computeQualityHealthScore(100, 100, 100)).toBeLessThanOrEqual(100);
  });

  it("returns 100 when all components are 100", () => {
    // 0.4 * 100 + 0.3 * 100 + 0.3 * 100 = 40 + 30 + 30 = 100
    expect(computeQualityHealthScore(100, 100, 100)).toBe(100);
  });

  it("handles mixed null and valid values", () => {
    // 0.4 * 50 + 0.3 * 0 + 0.3 * 80 = 20 + 0 + 24 = 44
    expect(computeQualityHealthScore(50, null, 80)).toBe(44);
  });
});
