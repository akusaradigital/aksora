import { describe, expect, it } from "vitest";
import en from "../dictionaries/en";
import id from "../dictionaries/id";

// ponytail: flat key comparison covers nested objects and detects missing/extra keys cleanly
function getDeepKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.keys(obj).flatMap((key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return getDeepKeys(value as Record<string, unknown>, fullKey);
    }
    return fullKey;
  });
}

describe("i18n dictionary parity", () => {
  it("en and id dictionaries have 100% matching key paths", () => {
    const enKeys = getDeepKeys(en).sort();
    const idKeys = getDeepKeys(id).sort();

    const missingInId = enKeys.filter((k) => !idKeys.includes(k));
    const extraInId = idKeys.filter((k) => !enKeys.includes(k));

    expect(missingInId, `Keys in 'en' missing from 'id'`).toEqual([]);
    expect(extraInId, `Keys in 'id' not present in 'en'`).toEqual([]);
  });
});
