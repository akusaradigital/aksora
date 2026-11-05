"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkItem {
  name: string;
  href: string;
  match: (pathname: string, hash: string) => boolean;
}

export function MarketingNavLinks({ isMobile, onItemClick }: { isMobile?: boolean; onItemClick?: () => void }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navItems: NavLinkItem[] = [
    {
      name: "Home",
      href: "/",
      match: (p, h) => p === "/" && (!h || h === "#"),
    },
    {
      name: "Features",
      href: "/features",
      match: (p, h) => p.startsWith("/features") || (p === "/" && h === "#features"),
    },
    {
      name: "Platform",
      href: "/#platform",
      match: (p, h) => p === "/" && h === "#platform",
    },
    {
      name: "Pricing",
      href: "/pricing",
      match: (p, h) => p.startsWith("/pricing") || (p === "/" && h === "#pricing"),
    },
    {
      name: "API Docs",
      href: "/docs/api",
      match: (p) => p.startsWith("/docs"),
    },
  ];

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2 p-4 text-left">
        {navItems.map((item) => {
          const isActive = item.match(pathname || "", hash);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                if (item.href.includes("#")) {
                  setHash(item.href.slice(item.href.indexOf("#")));
                } else {
                  setHash("");
                }
                onItemClick?.();
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-blue-50 font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                  : "font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-blue-400",
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-7 md:flex">
      {navItems.map((item) => {
        const isActive = item.match(pathname || "", hash);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => {
              if (item.href.includes("#")) {
                setHash(item.href.slice(item.href.indexOf("#")));
              } else {
                setHash("");
              }
            }}
            className={cn(
              "relative py-1 text-xs transition-colors",
              isActive
                ? "font-bold text-blue-600 dark:text-blue-400"
                : "font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400",
            )}
          >
            <span>{item.name}</span>
            {isActive && (
              <span
                className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-in fade-in duration-150"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
