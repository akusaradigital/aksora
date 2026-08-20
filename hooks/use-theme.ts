"use client";

import { useContext } from "react";
import { ThemeContext, type Theme } from "@/lib/theme/theme-context";

export type { Theme };

// ponytail: fallback to 'system' when outside ThemeProvider for seamless unit test execution
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "system" as const, setTheme: () => {} };
  }
  return ctx;
}
