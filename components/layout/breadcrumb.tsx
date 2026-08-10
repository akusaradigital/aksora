import Link from "next/link";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string; active?: boolean };

export function Breadcrumb({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-500", className)}>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300" aria-hidden>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="text-gray-500 transition hover:text-blue-600">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-semibold">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
