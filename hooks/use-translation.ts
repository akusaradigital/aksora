"use client";

import { useContext } from "react";
import { LocaleContext } from "@/lib/i18n/locale-context";
import { getDictionary } from "@/lib/i18n/dictionary";

// ponytail: fallback to 'en' dictionary when outside LocaleProvider for seamless unit test execution
export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en" as const,
      dict: getDictionary("en"),
      setLocale: () => {},
    };
  }
  return ctx;
}
