import Link from "next/link";
import Image from "next/image";
import { getLocale, getDictionary } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export async function MarketingHeader() {
  const t = getDictionary(await getLocale()).header;
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white" aria-label="Main navigation">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Aksora" width={28} height={28} className="shrink-0" priority />
          <span className="text-sm font-semibold text-slate-950">Aksora</span>
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/#features" className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-950">{t.features}</Link>
          <Link href="/#testimonials" className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-950">{t.testimonials}</Link>
          <Link href="/#pricing" className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-950">{t.pricing}</Link>
          <Link href="/#roi" className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-950">{t.estimate}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="text-[12px] font-medium text-slate-600 transition-colors hover:text-slate-950">
            {t.signIn}
          </Link>
          <Link href="/login" className="bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700">
            {t.createAccount}
          </Link>
        </div>
      </div>
    </nav>
  );
}
