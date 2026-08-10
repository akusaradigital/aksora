"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "@phosphor-icons/react";

export function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-card flex items-start gap-3 p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center  text-white", color ?? "bg-gray-400")}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-2xl font-bold leading-tight text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] font-medium text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200/70 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function TrendIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <ArrowUp size={13} weight="bold" />;
  if (direction === "down") return <ArrowDown size={13} weight="bold" />;
  return <Minus size={13} weight="bold" />;
}
