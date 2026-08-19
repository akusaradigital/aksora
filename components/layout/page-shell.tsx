"use client";

import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/layout/breadcrumb";

export function PageShell({
  icon,
  eyebrow,
  title,
  description,
  actions,
  controls,
  children,
  className,
  crumbs,
  flush,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  crumbs?: { label: string; href?: string }[];
  flush?: boolean;
}) {
  return (
    <section suppressHydrationWarning className={cn("space-y-4 pb-4", className)}>
      {crumbs && (
        <div suppressHydrationWarning className="mb-1">
          <Breadcrumb crumbs={crumbs} />
        </div>
      )}
      <header className="border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-3">
              {icon ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-sky-100 bg-sky-50 text-sky-700">
                  {icon}
                </div>
              ) : null}
              <div className="min-w-0">
                {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-600">{eyebrow}</p> : null}
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">{title}</h1>
              </div>
            </div>
            {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? (
            <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
        {controls ? <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">{controls}</div> : null}
      </header>
      <div
        className={cn(
          "min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm",
          flush ? "p-0" : "px-5 py-4 sm:px-6 sm:py-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function ActionButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconActionLink({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
        className,
      )}
    >
      {children}
    </a>
  );
}

