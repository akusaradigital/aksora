import Link from "next/link";
import Image from "next/image";

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8" role="contentinfo">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid sm:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Image src="/logo.svg" alt="Aksora" width={24} height={24} className="shrink-0" priority />
              <span className="text-[12px] font-bold text-gray-900">Aksora</span>
            </Link>
            <p className="text-[11px] text-gray-500 leading-relaxed">The modern QA workspace for teams that ship quality software.</p>
          </div>
          <nav aria-label="Product links">
            <p className="text-[11px] font-semibold text-gray-900 mb-2">Product</p>
            <div className="space-y-1.5">
              <FooterLink href="/features" label="Features" />
              <FooterLink href="/pricing" label="Pricing" />
              <FooterLink href="/demo" label="Demo" />
            </div>
          </nav>
          <nav aria-label="Company links">
            <p className="text-[11px] font-semibold text-gray-900 mb-2">Company</p>
            <div className="space-y-1.5">
              <FooterLink href="/about" label="About" />
              <FooterLink href="/blog" label="Blog" />
              <FooterLink href="/contact" label="Contact" />
            </div>
          </nav>
          <nav aria-label="Legal links">
            <p className="text-[11px] font-semibold text-gray-900 mb-2">Legal</p>
            <div className="space-y-1.5">
              <FooterLink href="/privacy" label="Privacy Policy" />
              <FooterLink href="/security" label="Security" />
            </div>
          </nav>
        </div>
        <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-center">
          <span className="text-[10px] text-gray-400">© 2026 — Aksora by <a href="https://akusaradigital.com" className="text-gray-500 hover:text-blue-600" target="_blank" rel="noopener noreferrer">Akusara Digital</a></span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block text-[11px] text-gray-500 hover:text-gray-900 transition-colors">{label}</Link>
  );
}
