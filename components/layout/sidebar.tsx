"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { normalizeRole } from "@/lib/roles";
import { BrandMark } from "@/components/shared/brand-mark";
import { filterGroups, SidebarSection } from "@/components/layout/sidebar-nav";
import { useTranslation } from "@/hooks/use-translation";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

// Re-export NotificationPanel for consumers that import from sidebar
export { NotificationPanel } from "@/components/layout/sidebar-notifications";

type TooltipState = { label: string; y: number } | null;

function SidebarTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[var(--z-tooltip)] flex items-center"
      style={{ top: tooltip.y, left: "calc(var(--sidebar-collapsed) + 4px)" }}
    >
      <div className="whitespace-nowrap bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-md">
        {tooltip.label}
      </div>
    </div>,
    document.body
  );
}

function SidebarActionButton({
  collapsed,
  onClick,
  onMouseEnter,
  onMouseLeave,
  tone,
  icon,
  label,
}: {
  collapsed: boolean;
  onClick: () => void;
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  tone: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "flex h-9 w-full items-center text-[13px] font-medium transition-colors duration-100",
        tone,
        collapsed ? "justify-center px-0" : "gap-2.5 px-3",
      )}
    >
      {icon}
      <span className={cn("overflow-hidden whitespace-nowrap transition-all duration-150", collapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
        {label}
      </span>
    </button>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  userRole = "",
}: {
  collapsed: boolean;
  onToggle: () => void;
  onLogout?: () => void;
  userRole?: string;
}) {
  const pathname = usePathname();
  const { dict: t } = useTranslation();
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const role = normalizeRole(userRole);
  const visibleGroups = filterGroups(role, t.sidebar);

  function showTooltip(e: React.MouseEvent<HTMLElement>, label: string) {
    if (!collapsed) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ label, y: rect.top + rect.height / 2 - 12 });
  }
  function hideTooltip() { setTooltip(null); }

  return (
    <>
      <SidebarTooltip tooltip={tooltip} />

      <aside
        suppressHydrationWarning
        className={cn(
          "fixed inset-y-0 left-0 top-0 z-[var(--z-sidebar)] flex h-full border-r border-slate-200 bg-[linear-gradient(180deg,var(--bg-sidebar)_0%,var(--bg-app)_100%)] transition-all duration-150 ease-in-out",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        <div className="flex w-full flex-col">
          {/* Logo */}
          <div className={cn("flex items-center gap-2.5 border-b border-slate-200 px-4 py-3", collapsed ? "justify-center" : "")}>
            <BrandMark
              compact
              showLabel={!collapsed}
              labelClassName={cn(
                "transition-all duration-150 origin-left",
                collapsed ? "opacity-0 scale-0 w-0 overflow-hidden" : "opacity-100 scale-100 w-auto"
              )}
            />
          </div>

          {/* Nav */}
          <div className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-1" : "px-0")}>
            <nav className="space-y-3">
              {visibleGroups.map((group) => (
                <SidebarSection
                  key={group.title || "dashboard"}
                  group={group}
                  pathname={pathname}
                  collapsed={collapsed}
                  showTooltip={showTooltip}
                  hideTooltip={hideTooltip}
                />
              ))}
            </nav>
          </div>

          {/* Bottom actions */}
          <div className={cn("mt-auto border-t border-slate-200 py-2", collapsed ? "px-1" : "px-0")}>
            {!collapsed && (
              <div className="px-3 pb-2">
                <LanguageSwitcher />
              </div>
            )}
            <SidebarActionButton
              collapsed={collapsed}
              onClick={onToggle}
              onMouseEnter={(e) => showTooltip(e, collapsed ? t.sidebar.expand : "")}
              onMouseLeave={hideTooltip}
              tone="text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              icon={collapsed ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
              label={t.sidebar.collapse}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
