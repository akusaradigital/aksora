import Link from "next/link";
import Image from "next/image";
import { FooterThemeSwitcher } from "@/components/shared/footer-theme-switcher";
export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-16 text-slate-600 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400" role="contentinfo">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5 text-left">
          {/* Column 1: Brand & Bio */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image src="/logo.svg" alt="Aksora" width={28} height={28} className="shrink-0" priority />
              <span className="text-base font-bold tracking-tight text-slate-950 dark:text-white">Aksora</span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Effortlessly manage test plans, live runs, defects, and sprint velocity in one high-velocity QA &amp; engineering platform.
            </p>
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 pt-1">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-950 dark:hover:text-white transition-colors text-xs font-mono">
                GitHub
              </a>
              <span>•</span>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-slate-950 dark:hover:text-white transition-colors text-xs font-mono">
                Twitter
              </a>
              <span>•</span>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-slate-950 dark:hover:text-white transition-colors text-xs font-mono">
                LinkedIn
              </a>
            </div>
          </div>

          {/* Column 2: Navigate */}
          <nav aria-label="Navigation links" className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">Navigate</p>
            <div className="space-y-2 text-xs">
              <FooterLink href="/" label="Home" />
              <FooterLink href="/#features" label="Features" />
              <FooterLink href="/#platform" label="Platform" />
              <FooterLink href="/#pricing" label="Pricing" />
              <FooterLink href="/demo" label="Interactive Demo" />
            </div>
          </nav>

          {/* Column 3: Platform Modules */}
          <nav aria-label="Platform modules" className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">Platform</p>
            <div className="space-y-2 text-xs">
              <FooterLink href="/login" label="Test Case Management" />
              <FooterLink href="/login" label="Execution Runs" />
              <FooterLink href="/login" label="Defect Tracking" />
              <FooterLink href="/login" label="Sprint Lifecycle" />
              <FooterLink href="/login" label="Daily Work Logs" />
            </div>
          </nav>

          {/* Column 4: Resources */}
          <nav aria-label="Resources" className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">Resources</p>
            <div className="space-y-2 text-xs">
              <FooterLink href="/docs/api" label="API Documentation" />
              <FooterLink href="/api/openapi.json" label="OpenAPI 3.0 Spec" />
              <FooterLink href="/security" label="Security Architecture" />
              <FooterLink href="/privacy" label="Privacy Policy" />
              <FooterLink href="/about" label="About Aksora" />
            </div>
          </nav>

          {/* Column 5: Contact Us */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">Contact Us</p>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>Email: <a href="mailto:contact@akusaraproject.my.id" className="hover:text-slate-950 dark:hover:text-white transition-colors">contact@akusaraproject.my.id</a></p>
              <p>Company: <a href="https://akusaradigital.com" target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold">Akusara Digital</a></p>
              <p className="text-slate-500 dark:text-slate-400">Global Cloud &amp; On-Premise Support</p>
            </div>
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-block rounded-full bg-[#a3e635] px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#bef264] shadow-xs"
              >
                Help Center
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            &copy; 2026 Aksora by <a href="https://akusaradigital.com" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition font-medium">Akusara Digital</a>. All rights reserved.
          </span>
          <div className="flex items-center flex-wrap gap-4 sm:gap-5">
            <FooterThemeSwitcher />
            <Link href="/privacy" className="hover:text-slate-950 dark:hover:text-white transition font-medium">Privacy Policy</Link>
            <Link href="/security" className="hover:text-slate-950 dark:hover:text-white transition font-medium">Terms &amp; Security</Link>
            <Link href="/docs/api" className="hover:text-slate-950 dark:hover:text-white transition font-medium">API Reference</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block text-slate-600 dark:text-slate-400 transition-colors hover:text-slate-950 dark:hover:text-white">
      {label}
    </Link>
  );
}
