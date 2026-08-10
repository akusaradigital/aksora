"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Buildings, CurrencyCircleDollar, Megaphone, Headset, ClockCounterClockwise, ShieldCheck, SignOut, Export } from "@phosphor-icons/react";
import { ScrollToTop } from "@/components/layout/scroll-to-top";

const OverviewTab = dynamic(() => import("./admin-overview-tab").then((m) => m.OverviewTab), {
  ssr: false,
  loading: () => <div className="h-96 border border-gray-200 bg-gray-50 animate-pulse" />,
});
const RevenueTab = dynamic(() => import("./admin-revenue-tab").then((m) => m.RevenueTab), {
  ssr: false,
  loading: () => <div className="h-96 border border-gray-200 bg-gray-50 animate-pulse" />,
});
const AnnouncementsTab = dynamic(() => import("./admin-other-tabs").then((m) => m.AnnouncementsTab), {
  ssr: false,
  loading: () => <div className="h-64 border border-gray-200 bg-gray-50 animate-pulse" />,
});
const TicketsTab = dynamic(() => import("./admin-other-tabs").then((m) => m.TicketsTab), {
  ssr: false,
  loading: () => <div className="h-64 border border-gray-200 bg-gray-50 animate-pulse" />,
});
const AuditLogTab = dynamic(() => import("./admin-other-tabs").then((m) => m.AuditLogTab), {
  ssr: false,
  loading: () => <div className="h-64 border border-gray-200 bg-gray-50 animate-pulse" />,
});

type Tab = "overview" | "revenue" | "announcements" | "tickets" | "audit";

export default function AdminOverviewPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.user) { router.push("/login"); return; }
      setUser(d.user);
    }).catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }
    catch { setLoggingOut(false); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Buildings size={14} weight="bold" /> },
    { key: "revenue", label: "Revenue", icon: <CurrencyCircleDollar size={14} weight="bold" /> },
    { key: "announcements", label: "Announcements", icon: <Megaphone size={14} weight="bold" /> },
    { key: "tickets", label: "Tickets", icon: <Headset size={14} weight="bold" /> },
    { key: "audit", label: "Audit Log", icon: <ClockCounterClockwise size={14} weight="bold" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center bg-blue-600 text-white"><ShieldCheck size={18} weight="bold" /></div>
            <div><h1 className="text-sm font-bold text-gray-900">Super Admin Panel</h1><p className="text-[10px] text-gray-500">Aksora — Platform Management</p></div>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton />
            {user && <span className="hidden text-xs font-medium text-gray-600 sm:block">{user.name || user.email}</span>}
            <button onClick={handleLogout} disabled={loggingOut}
              className="flex h-8 items-center gap-1.5 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
              <SignOut size={14} weight="bold" />
              <span className="hidden sm:inline">{loggingOut ? "..." : "Logout"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-0 px-4 sm:px-6 lg:px-8">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {tab === "overview" && <OverviewTab />}
        {tab === "revenue" && <RevenueTab />}
        {tab === "announcements" && <AnnouncementsTab />}
        {tab === "tickets" && <TicketsTab />}
        {tab === "audit" && <AuditLogTab />}
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-3 text-center">
        <p className="text-[11px] font-medium text-gray-400">© 2026 — Aksora by <a href="https://akusaradigital.com" className="text-gray-500 hover:text-gray-300" target="_blank" rel="noopener noreferrer">Akusara Digital</a></p>
      </footer>
      <ScrollToTop />
    </div>
  );
}

function ExportButton() {
  const [open, setOpen] = useState(false);
  const download = (type: string) => { window.open(`/api/admin/export?type=${type}`, "_blank"); setOpen(false); };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-8 items-center gap-1.5 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:border-blue-200 hover:text-blue-600">
        <Export size={14} weight="bold" /> <span className="hidden sm:inline">Export</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 border border-gray-200 bg-white shadow-lg">
          {[{ type: "summary", label: "Platform Summary" }, { type: "companies", label: "Companies List" }, { type: "revenue", label: "Revenue Report" }, { type: "usage", label: "Usage Metrics" }].map((item) => (
            <button key={item.type} onClick={() => download(item.type)} className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700">{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
