"use client";

import type { ReactNode } from"react";
import { CheckCircle, Info, WarningCircle, XCircle } from"@phosphor-icons/react";
import { cn } from"@/lib/utils";

type Variant = "error" | "warning" | "info" | "success";

type Props = {
 variant?: Variant;
 message: ReactNode;
 title?: string;
 className?: string;
 compact?: boolean;
};

const styles: Record<Variant, { box: string; icon: ReactNode }> = {
 error: { box: "border-rose-200 bg-rose-50 text-rose-700", icon: <XCircle size={16} weight="bold" className="text-rose-600" /> },
 warning: { box: "border-amber-200 bg-amber-50 text-amber-700", icon: <WarningCircle size={16} weight="bold" className="text-amber-600" /> },
 info: { box: "border-sky-200 bg-sky-50 text-sky-700", icon: <Info size={16} weight="bold" className="text-sky-600" /> },
 success: { box: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <CheckCircle size={16} weight="bold" className="text-emerald-600" /> },
};

export function InlineAlert({ variant = "info", message, title, className, compact = false }: Props) {
 const style = styles[variant];

 return (
  <div
   className={cn(
    "flex items-start gap-2  border px-3 py-2 text-sm",
    style.box,
    compact && "px-0 py-0 border-0 bg-transparent",
    className,
   )}
  >
   {!compact && style.icon}
   <div className={cn("min-w-0", compact ? "text-[11px] leading-4" : "text-sm leading-5")}>
    {title && <div className="font-semibold">{title}</div>}
    <div>{message}</div>
   </div>
  </div>
 );
}
