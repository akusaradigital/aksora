import Link from "next/link";
import Image from "next/image";

export function MarketingHeader() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm" aria-label="Main navigation">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Aksora" width={28} height={28} className="shrink-0" priority />
          <span className="text-sm font-bold text-gray-900">Aksora</span>
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          <Link href="/features" className="text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</Link>
          <Link href="/pricing" className="text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="/demo" className="text-[12px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Demo</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[12px] font-medium text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link href="/login" className="bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 transition-colors rounded-full">
            Start free
          </Link>
        </div>
      </div>
    </nav>
  );
}
