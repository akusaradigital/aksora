"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { List, X } from "@phosphor-icons/react";
import { useTranslation } from "@/hooks/use-translation";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { MarketingNavLinks } from "@/components/landing/marketing-nav-links";

export function MarketingHeader() {
  const { dict } = useTranslation();
  const t = dict.header;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/95" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Aksora" width={32} height={32} className="shrink-0" priority />
          <span className="text-base font-bold tracking-tight text-slate-950 dark:text-white">Aksora</span>
        </Link>

        {/* Desktop Navigation Links with Active Blue State */}
        <MarketingNavLinks />

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t.signIn}
          </Link>
          <Link
            href="/demo"
            className="rounded-full bg-[#a3e635] px-5 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition-all hover:bg-[#bef264] hover:shadow"
          >
            Demo
          </Link>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-top-2 duration-150">
          <MarketingNavLinks isMobile onItemClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </nav>
  );
}
