"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CaretRight,
  CheckCircle,
  Kanban,
  Timer,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/shared/badge";
import { AgeIndicator } from "@/components/shared/age-indicator";
import { QuickActionButtons } from "@/components/shared/quick-action-buttons";

export type AttentionItem = {
  type: "bug" | "task" | "stuck";
  /** Numeric or string id of the underlying record (used for quick-action API). */
  id?: number | string;
  /** Title of the item. */
  title: string;
  /** Severity / priority badge text. */
  badge: string;
  /** Link target for the item. */
  href: string;
  /** ISO timestamp of the last status change, or null. */
  statusChangedAt?: string | null;
  /** Pre-computed integer day count from the API. */
  ageDays?: number | null;
  /** Module type for quick-action targeting. Stuck items omit this to disable quick-actions. */
  moduleType?: "Bug" | "Task";
};

type AttentionPanelProps = {
  items: AttentionItem[];
  /** Authenticated user's normalized role. */
  userRole?: string;
};

/**
 * Whether a role is allowed to perform inline quick actions (assign / change status)
 * on attention items. Mirrors the server-side check in /api/dashboard/quick-action.
 */
export function canUseQuickActions(role: string | undefined | null): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * AttentionPanel - lists critical bugs, priority tasks, and stuck items requiring action.
 * Renders an AgeIndicator on every item and reveals QuickActionButtons on hover/focus
 * for users with admin or superadmin roles.
 */
export function AttentionPanel({ items, userRole }: AttentionPanelProps) {
  const showQuickActions = canUseQuickActions(userRole);

  return (
    <div className="lg:col-span-3 flex flex-col  border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700">Attention Needed</h3>
        <Warning size={15} className="text-amber-400" weight="bold" />
      </div>
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <CheckCircle size={28} weight="bold" className="text-emerald-400" />
          <p className="text-xs font-semibold">All clear - no critical items right now.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1" data-testid="attention-panel-list">
          {items.slice(0, 10).map((item, i) => (
            <AttentionRow key={`${item.type}-${item.id ?? i}`} item={item} canQuickAction={showQuickActions} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionRow({ item, canQuickAction }: { item: AttentionItem; canQuickAction: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const showButtons = (hovered || focused) && canQuickAction && Boolean(item.id) && Boolean(item.moduleType);

  return (
    <div
      className="animate-attention-slide-in relative flex items-center gap-2.5  border border-gray-100 p-3 hover:border-gray-200 hover:bg-gray-50 transition group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        // Only clear focus when focus leaves the row entirely
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) setFocused(false);
      }}
      tabIndex={0}
    >
      <Link href={item.href} prefetch={false} className="flex flex-1 items-center gap-2.5 min-w-0">
        <div className="shrink-0">
          {item.type === "bug" && <XCircle size={14} weight="fill" className="text-rose-500" />}
          {item.type === "task" && <Kanban size={14} weight="bold" className="text-blue-500" />}
          {item.type === "stuck" && <Timer size={14} weight="bold" className="text-amber-500" />}
        </div>
        <span className="flex-1 text-xs font-semibold text-gray-700 truncate group-hover:text-gray-900">
          {item.title}
        </span>
      </Link>
      {canQuickAction && item.id && item.moduleType ? (
        <QuickActionButtons
          entityId={item.id}
          moduleType={item.moduleType}
          visible={showButtons}
        />
      ) : null}
      <AgeIndicator statusChangedAt={item.statusChangedAt ?? null} ageDays={item.ageDays ?? null} />
      <Badge value={item.badge} />
      <Link href={item.href} prefetch={false} aria-label="Open">
        <CaretRight size={10} className="text-gray-300 group-hover:text-gray-500" />
      </Link>
    </div>
  );
}

/**
 * Hook to fetch the current authenticated user's role from /api/auth/me.
 * Returns "" while loading or on error so UI defaults to non-privileged behavior.
 */
export function useCurrentUserRole(): string {
  const [role, setRole] = useState<string>("");
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.user?.role) setRole(String(data.user.role));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return role;
}
