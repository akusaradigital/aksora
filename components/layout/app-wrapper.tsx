"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "./sidebar";
import { GlobalSearch } from "@/components/shared/search/global-search";
import { NotificationPanel } from "./sidebar";
import { Bell, CaretDown, CaretUp, Gear, List, SignOut, UserCircle } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roles";
import { TrialBanner } from "@/components/layout/trial-banner";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { CommandPalette } from "@/components/shared/search/command-palette";
import { OnboardingTour } from "@/components/layout/onboarding-tour";
import { useAssignmentNotifications } from "@/hooks/use-assignment-notifications";

type AppWrapperProps = {
  children: React.ReactNode;
};

type AppUser = {
  role?: string;
  company?: string | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

export function AppWrapper({ children }: AppWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [user, setUser] = useState<AppUser | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const companyName = String(user?.company || "").trim();
  const accountLabel = companyName || (user ? getRoleLabel(user?.role || "") : "Workspace");

  const marketingPaths = ["/", "/login", "/register", "/features", "/pricing", "/demo", "/about", "/blog", "/contact", "/privacy", "/security"];
  const isAuthScreen = marketingPaths.includes(pathname);
  const isSuperadminScreen = pathname.startsWith("/admin/overview");

  // Real-time assignment notifications via SSE (only when logged in)
  useAssignmentNotifications(!isAuthScreen && !!user);

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const saved = window.localStorage.getItem("qa-sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "1");
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem("qa-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed, mounted]);

  useEffect(() => {
    if (isAuthScreen) return;
    void refreshUser();
    const t = setTimeout(() => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setNotifCount((d.notifications || []).length))
        .catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [isAuthScreen, pathname]);

  useEffect(() => {
    const handler = () => {
      void refreshUser();
    };
    window.addEventListener("qa:profile-updated", handler);
    return () => window.removeEventListener("qa:profile-updated", handler);
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "k") return;
      if (e.key === "n") { e.preventDefault(); window.dispatchEvent(new Event("qa:open-form")); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const sidebarWidth = !mounted ? "240px" : (collapsed ? "64px" : "240px");

  const avatarColors = ["bg-blue-600", "bg-violet-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600", "bg-indigo-600", "bg-teal-600"];
  const avatarColor = avatarColors[
    (String(user?.name || user?.email || "U").charCodeAt(0) + String(user?.name || user?.email || "U").length) % avatarColors.length
  ];

  if (isAuthScreen || isSuperadminScreen) {
    return <>{children}</>;
  }

  return (
    <div suppressHydrationWarning className="flex min-h-screen bg-[var(--bg-app)] overflow-x-hidden">
      <CommandPalette />
      <OnboardingTour />
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 transition-transform duration-150 ease-in-out md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onLogout={() => setShowLogoutConfirm(true)}
          userRole={user?.role || ""}
        />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <div
          suppressHydrationWarning
          className="flex flex-1 flex-col transition-[margin-left] duration-150 ease-in-out md:ml-[var(--sidebar-w)]"
          style={{ "--sidebar-w": sidebarWidth } as React.CSSProperties}
        >
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[var(--border-color)] bg-white px-4 md:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 md:hidden"
              aria-label="Open menu"
            >
              <List size={18} weight="bold" />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <div ref={notifRef} className="relative">
                {notifOpen && <NotificationPanel anchorRef={notifRef} onClose={() => setNotifOpen(false)} />}
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  title="Notifications"
                  aria-label="Notifications"
                  className="relative flex h-8 w-8 items-center justify-center border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
                >
                  <Bell size={16} weight="bold" />
                  {notifCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-rose-500 px-0.5 text-[10px] font-bold text-white">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </button>
              </div>
              <GlobalSearch />
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex h-8 items-center gap-2 border border-gray-200 bg-white px-2 text-left transition hover:bg-gray-50"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" loading="lazy" decoding="async" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white", avatarColor)}>
                      {String(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-28 flex-col leading-tight md:flex">
                    <span className="truncate text-xs font-semibold text-gray-800">
                      {user?.name || user?.email || "Account"}
                    </span>
                    <span className="truncate text-[10px] text-gray-500">
                      {accountLabel}
                    </span>
                  </span>
                  <CaretDown size={12} weight="bold" className="text-gray-400" />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-72 border border-gray-200 bg-white p-4 shadow-lg">
                    <div className="flex flex-col items-center gap-2">
                      <label className="group relative cursor-pointer" title="Change avatar">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="Avatar" loading="lazy" decoding="async" className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-200" />
                        ) : (
                          <div className={cn("flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white", avatarColor)}>
                            {String(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                          <UserCircle size={20} weight="bold" className="text-white" />
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            // Compress to tiny avatar (64x64, quality 0.6)
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");
                            const img = new Image();
                            img.onload = async () => {
                              canvas.width = 64;
                              canvas.height = 64;
                              ctx?.drawImage(img, 0, 0, 64, 64);
                              const dataUrl = canvas.toDataURL("image/webp", 0.6);
                              try {
                                const res = await fetch("/api/auth/avatar", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ avatar: dataUrl }),
                                });
                                if (res.ok) {
                                  await refreshUser();
                                }
                              } catch {}
                            };
                            img.src = URL.createObjectURL(file);
                          }}
                        />
                      </label>
                      <p className="text-sm font-bold text-gray-900">{user?.name || user?.email || "Account"}</p>
                    </div>

                    <div className="mt-3 border border-gray-100 bg-gray-50 p-3 text-xs">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-500">Email</span>
                        <span className="font-semibold text-gray-800">{user?.email || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-500">Role</span>
                        <span className="font-semibold text-gray-800">{getRoleLabel(user?.role || "")}</span>
                      </div>
                      {companyName && (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-gray-500">Workspace</span>
                          <span className="max-w-36 truncate font-semibold text-gray-800">{companyName}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-0.5 border-t border-gray-100 pt-3">
                      <Link href="/settings/profile" prefetch={false} onClick={() => setAccountOpen(false)} className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                        <UserCircle size={15} weight="bold" />
                        Profile
                      </Link>
                      {(String(user?.role || "").trim() === "admin" || String(user?.role || "").trim() === "superadmin") && (
                        <Link href="/settings/users" prefetch={false} onClick={() => setAccountOpen(false)} className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                          <Gear size={15} weight="bold" />
                          Account settings
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => { setAccountOpen(false); setShowLogoutConfirm(true); }}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        <SignOut size={15} weight="bold" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
            <TrialBanner />
            <AnnouncementBanner />
            <div key={pathname} className="mx-auto max-w-7xl animate-in fade-in duration-150">
              {children}
            </div>
          </main>
          <footer className="border-t border-[var(--border-color)] bg-gray-50/50 px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-gray-400">
              © 2026 — Aksora by <a href="https://akusaradigital.com" className="text-gray-500 hover:text-blue-600" target="_blank" rel="noopener noreferrer">Akusara Digital</a>
            </p>
          </footer>
        </div>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 z-50 flex h-9 w-9 items-center justify-center border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:bg-gray-900 hover:text-white hover:border-gray-900"
          aria-label="Scroll to top"
        >
          <CaretUp size={16} weight="bold" />
        </button>
      )}

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out from your session? All unsaved work might be lost."
        confirmText={loggingOut ? "Logging out..." : "Yes, Log Out"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => !loggingOut && setShowLogoutConfirm(false)}
      />
    </div>
  );
}

