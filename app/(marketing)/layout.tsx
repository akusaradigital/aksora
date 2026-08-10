import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <MarketingHeader />
      <main className="flex-1 pt-14">
        {children}
      </main>
      <MarketingFooter />
      <ScrollToTop />
    </div>
  );
}

