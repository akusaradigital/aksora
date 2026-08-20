import { describe, it, expect } from "vitest";
import { exportDictionary, validateTranslationDictionary } from "@/lib/i18n/export-import";

describe("i18n export-import helper", () => {
  it("exports dictionary for en and id locales", () => {
    const enExport = exportDictionary("en");
    expect(enExport.locale).toBe("en");
    expect(enExport.version).toBe("1.0");
    expect(typeof enExport.dictionary).toBe("object");
    expect((enExport.dictionary as any).common?.backToHome).toBe("Back to Home");

    const idExport = exportDictionary("id");
    expect(idExport.locale).toBe("id");
    expect((idExport.dictionary as any).common?.backToHome).toBe("Kembali ke Beranda");
  });

  it("validates identical dictionary successfully", () => {
    const enExport = exportDictionary("en");
    const result = validateTranslationDictionary(enExport.dictionary, "en");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.missingKeys).toHaveLength(0);
  });

  it("fails validation for missing keys", () => {
    const invalidDict = {
      common: {
        backToHome: "Back",
      },
    };
    const result = validateTranslationDictionary(invalidDict, "en");
    expect(result.valid).toBe(false);
    expect(result.missingKeys.length).toBeGreaterThan(0);
  });

  it("fails validation on invalid input type", () => {
    const result = validateTranslationDictionary(null, "en");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid dictionary");
  });
});
