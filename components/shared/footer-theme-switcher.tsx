"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function FooterThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before hydration, render default Day (Light) mode safely without flicker
  const isDark = mounted ? theme === "dark" : false;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 p-0.5 text-[11px] font-semibold transition-colors dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
      role="group"
      aria-label="Theme switcher"
    >
      {/* Day Mode Button */}
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all",
          !isDark
            ? "border border-slate-300/80 bg-white font-bold text-slate-950 shadow-xs"
            : "text-slate-400 hover:text-white",
        )}
        aria-pressed={!isDark}
      >
        <Sun size={13} weight={!isDark ? "fill" : "bold"} className={!isDark ? "text-amber-500" : "text-slate-400"} />
        <span>Day</span>
      </button>

      {/* Dark Mode Button */}
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all",
          isDark
            ? "border border-slate-700 bg-slate-800 font-bold text-white shadow-xs"
            : "text-slate-600 hover:text-slate-950",
        )}
        aria-pressed={isDark}
      >
        <Moon size={13} weight={isDark ? "fill" : "bold"} className={isDark ? "text-blue-400" : "text-slate-500"} />
        <span>Dark</span>
      </button>
    </div>
  );
}
