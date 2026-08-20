"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useTranslation();

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5 text-[11px] font-semibold", className)}>
      {(["en", "id"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "rounded px-1.5 py-0.5 uppercase transition-colors",
            locale === code ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
