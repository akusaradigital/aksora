import Link from "next/link";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string; active?: boolean };

export function Breadcrumb({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400", className)}>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300" aria-hidden>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="text-slate-500 transition hover:text-sky-700">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-bold text-slate-900">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
