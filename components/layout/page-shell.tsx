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
    <section suppressHydrationWarning className={cn("space-y-4", className)}>
      {crumbs && (
        <div suppressHydrationWarning>
          <Breadcrumb crumbs={crumbs} />
        </div>
      )}
      <div>
        <div className="pb-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex items-center gap-3">
                {icon ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-blue-50 text-blue-700 border border-blue-100">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p> : null}
                  <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
                </div>
              </div>
              {description ? <p className="mt-1.5 text-sm text-gray-500">{description}</p> : null}
            </div>
            {actions ? (
              <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
        {controls ? <div className="border-b border-gray-200 pb-3 mb-4 text-sm text-gray-600">{controls}</div> : null}
        <div className={cn(
          "min-w-0 overflow-hidden bg-white border border-gray-200",
          flush ? "p-0" : "px-5 py-4",
        )}>{children}</div>
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
        "inline-flex h-8 items-center gap-1.5 bg-white border border-gray-200 px-3 outline-none text-[13px] font-medium text-gray-700 transition hover:bg-gray-50 hover:text-blue-700 hover:border-blue-200",
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
        "inline-flex h-8 w-8 items-center justify-center bg-white border border-gray-200 outline-none text-gray-600 transition hover:bg-gray-50 hover:text-blue-700 hover:border-blue-200",
        className,
      )}
    >
      {children}
    </a>
  );
}

