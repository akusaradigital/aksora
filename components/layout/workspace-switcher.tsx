"use client";

import { Buildings, CheckCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Membership = {
  id: number;
  workspaceId: number;
  role: string;
  status: string;
  name: string;
  slug: string;
};

export function WorkspaceSwitcher({
  memberships,
  activeWorkspaceId,
  compact = false,
  onSwitched,
}: {
  memberships: Membership[];
  activeWorkspaceId?: number | null;
  compact?: boolean;
  onSwitched?: () => void;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const switchWorkspace = async (workspaceId: number) => {
    if (pendingId) return;
    setPendingId(workspaceId);
    try {
      const res = await fetch("/api/auth/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error("Failed to switch workspace.");
      onSwitched?.();
      router.refresh();
      router.push("/dashboard");
    } finally {
      setPendingId(null);
    }
  };

  if (memberships.length === 0) {
    return <p className="text-xs text-gray-500">No workspaces yet.</p>;
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-3"}>
      {!compact && (
        <div className="flex items-center gap-2 text-gray-900">
          <Buildings size={16} weight="bold" />
          <p className="text-sm font-bold">Your Workspaces</p>
        </div>
      )}
      <div className="space-y-2">
        {memberships.map((membership) => {
          const active = Number(activeWorkspaceId || 0) === Number(membership.workspaceId);
          return (
            <div key={membership.id} className="flex items-center justify-between border border-gray-200 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{membership.name}</p>
                <p className="text-[11px] text-gray-500">{membership.role}</p>
              </div>
              {active ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle size={13} weight="bold" />
                  Active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => switchWorkspace(membership.workspaceId)}
                  disabled={pendingId === membership.workspaceId}
                  className="border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {pendingId === membership.workspaceId ? "Switching..." : "Switch"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
