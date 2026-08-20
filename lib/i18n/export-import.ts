import { getDictionary, type Locale } from "./dictionary";

export type TranslationDictionary = Record<string, unknown>;

export interface DictionaryExport {
  locale: Locale;
  version: string;
  dictionary: TranslationDictionary;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  missingKeys: string[];
  extraKeys: string[];
}

// ponytail: flat dot-notation key comparison instead of deep tree walking — dictionaries are nested objects with string leaf values
function getFlattenedKeys(obj: unknown, prefix = ""): Record<string, string> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return prefix ? { [prefix]: typeof obj === "string" ? obj : String(obj) } : {};
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, getFlattenedKeys(value, nextKey));
    } else {
      result[nextKey] = typeof value === "string" ? value : String(value);
    }
  }
  return result;
}

export function exportDictionary(locale: Locale): DictionaryExport {
  const dict = getDictionary(locale);
  return {
    locale,
    version: "1.0",
    dictionary: JSON.parse(JSON.stringify(dict)),
  };
}

export function validateTranslationDictionary(
  imported: unknown,
  baseLocale: Locale = "en"
): ValidationResult {
  const errors: string[] = [];
  const missingKeys: string[] = [];
  const extraKeys: string[] = [];

  if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
    return {
      valid: false,
      errors: ["Invalid dictionary: must be a JSON object"],
      missingKeys: [],
      extraKeys: [],
    };
  }

  const baseDict = getDictionary(baseLocale);
  const baseKeys = getFlattenedKeys(baseDict);
  const targetDict = (imported as Record<string, unknown>).dictionary && typeof (imported as Record<string, unknown>).dictionary === "object"
    ? (imported as { dictionary: unknown }).dictionary
    : imported;

  const targetKeys = getFlattenedKeys(targetDict);

  for (const key of Object.keys(baseKeys)) {
    if (!(key in targetKeys)) {
      missingKeys.push(key);
    } else if (typeof targetKeys[key] !== "string" || targetKeys[key].trim() === "") {
      errors.push(`Empty or invalid translation for key: ${key}`);
    }
  }

  for (const key of Object.keys(targetKeys)) {
    if (!(key in baseKeys)) {
      extraKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    errors.push(`Missing ${missingKeys.length} required translation keys`);
  }

  return {
    valid: errors.length === 0,
    errors,
    missingKeys,
    extraKeys,
  };
}
