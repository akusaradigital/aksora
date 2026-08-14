import Link from "next/link";
import Image from "next/image";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8" role="contentinfo">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <Link href="/" className="mb-3 flex items-center gap-2">
              <Image src="/logo.svg" alt="Aksora" width={24} height={24} className="shrink-0" priority />
              <span className="text-[12px] font-semibold text-slate-950">Aksora</span>
            </Link>
            <p className="text-[11px] leading-relaxed text-slate-500">
              QA planning, runs, and bug tracking in one workspace.
            </p>
          </div>
          <nav aria-label="Product links">
            <p className="mb-2 text-[11px] font-semibold text-slate-950">Product</p>
            <div className="space-y-1.5">
              <FooterLink href="/#features" label="Features" />
              <FooterLink href="/#pricing" label="Pricing" />
              <FooterLink href="/#roi" label="Estimate" />
            </div>
          </nav>
          <nav aria-label="Access links">
            <p className="mb-2 text-[11px] font-semibold text-slate-950">Access</p>
            <div className="space-y-1.5">
              <FooterLink href="/login" label="Sign in" />
              <FooterLink href="/login" label="Create account" />
            </div>
          </nav>
          <nav aria-label="Legal links">
            <p className="mb-2 text-[11px] font-semibold text-slate-950">Legal</p>
            <div className="space-y-1.5">
              <FooterLink href="/privacy" label="Privacy Policy" />
              <FooterLink href="/security" label="Security" />
            </div>
          </nav>
        </div>
        <div className="mt-8 flex items-center justify-center border-t border-slate-100 pt-5">
          <span className="text-[10px] text-slate-400">
            ? 2026 Aksora by{' '}
            <a
              href="https://akusaradigital.com"
              className="text-slate-500 transition-colors hover:text-blue-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Akusara Digital
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block text-[11px] text-slate-500 transition-colors hover:text-slate-950">
      {label}
    </Link>
  );
}
