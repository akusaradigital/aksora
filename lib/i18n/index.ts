import { cookies } from "next/headers";
import type { Locale } from "./dictionary";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("locale")?.value === "id" ? "id" : "en";
}

export { getDictionary, type Locale } from "./dictionary";
export { interpolate } from "./interpolate";
export { exportDictionary, validateTranslationDictionary } from "./export-import";
