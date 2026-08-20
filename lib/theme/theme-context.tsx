"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "system" | "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(theme: Theme) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "system" : (localStorage.getItem("theme") as Theme | null) ?? "system",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolveIsDark(theme));
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => document.documentElement.classList.toggle("dark", resolveIsDark(theme));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function setTheme(next: Theme) {
    localStorage.setItem("theme", next);
    setThemeState(next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
