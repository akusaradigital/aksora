"use client";

import { Monitor, Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/hooks/use-theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5 text-[11px] font-semibold", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 transition-colors",
            theme === value ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900",
          )}
        >
          <Icon size={14} weight="bold" />
          {label}
        </button>
      ))}
    </div>
  );
}
