import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <MarketingHeader />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <MarketingFooter />
      <ScrollToTop />
    </div>
  );
}

