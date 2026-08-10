"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/shared/badge";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type InlineStatusEditorProps = {
  value: string;
  options: Option[];
  onUpdate: (newValue: string) => void;
  disabled?: boolean;
};

export function InlineStatusEditor({ value, options, onUpdate, disabled }: InlineStatusEditorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (disabled || options.length === 0) {
    return <Badge value={value} />;
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="cursor-pointer transition hover:opacity-80"
        title="Click to change status"
      >
        <Badge value={value} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px]  border border-gray-200 bg-white shadow-md animate-in fade-in  duration-150">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (opt.value !== value) onUpdate(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition",
                opt.value === value ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50",
              )}
            >
              <Badge value={opt.value} />
              {opt.value === value && (
                <span className="ml-auto text-[10px] text-blue-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
