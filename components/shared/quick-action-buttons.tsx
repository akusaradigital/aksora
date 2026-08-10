"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowsClockwise, MagnifyingGlass, Check } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { bugStatusOptions, taskStatusOptions, type Option } from "@/lib/modules-core";

type QuickActionButtonsProps = {
  entityId: number | string;
  moduleType: "Bug" | "Task";
  visible: boolean;
  /** When provided, refreshes parent state after a successful action in addition to router.refresh(). */
  onUpdated?: () => void;
};

const STATUS_OPTIONS: Record<"Bug" | "Task", Option[]> = {
  Bug: bugStatusOptions,
  Task: taskStatusOptions,
};

export function QuickActionButtons({ entityId, moduleType, visible, onUpdated }: QuickActionButtonsProps) {
  const [activeDropdown, setActiveDropdown] = useState<"assign" | "status" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!activeDropdown) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeDropdown]);

  return (
    <div
      ref={containerRef}
      data-testid="quick-action-buttons"
      className={cn(
        "flex items-center gap-1 transition-all duration-100",
        visible || activeDropdown ? "opacity-100 visible" : "opacity-0 invisible",
      )}
      onClick={(e) => e.preventDefault()}
    >
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveDropdown(activeDropdown === "assign" ? null : "assign");
          }}
          className="flex h-6 w-6 items-center justify-center  border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition"
          title="Assign"
          aria-label="Assign"
        >
          <UserPlus size={12} weight="bold" />
        </button>
        {activeDropdown === "assign" && (
          <AssignDropdown
            entityId={entityId}
            moduleType={moduleType}
            onClose={() => setActiveDropdown(null)}
            onUpdated={onUpdated}
          />
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveDropdown(activeDropdown === "status" ? null : "status");
          }}
          className="flex h-6 w-6 items-center justify-center  border border-gray-200 bg-white text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition"
          title="Change Status"
          aria-label="Change Status"
        >
          <ArrowsClockwise size={12} weight="bold" />
        </button>
        {activeDropdown === "status" && (
          <StatusDropdown
            entityId={entityId}
            moduleType={moduleType}
            onClose={() => setActiveDropdown(null)}
            onUpdated={onUpdated}
          />
        )}
      </div>
    </div>
  );
}

// ── Assign Dropdown ────────────────────────────────────────────────────────

function AssignDropdown({
  entityId,
  moduleType,
  onClose,
  onUpdated,
}: {
  entityId: number | string;
  moduleType: "Bug" | "Task";
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch workspace members (max 50, company-scoped server side)
  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/members")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setMembers((data.options || []).slice(0, 50));
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setMembers([]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = members
    .filter(
      (m) =>
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.value.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 50);

  const handleAssign = useCallback(
    async (value: string) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/dashboard/quick-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: moduleType,
            entityId: Number(entityId),
            action: "assign",
            value,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to assign");
        }
        toast("Assignment updated successfully", "success");
        onClose();
        onUpdated?.();
        router.refresh();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to assign", "error");
      } finally {
        setSubmitting(false);
      }
    },
    [entityId, moduleType, onClose, onUpdated, router, submitting],
  );

  return (
    <div
      className="absolute right-0 top-full z-50 mt-1 w-56  border border-gray-200 bg-white shadow-md"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Assign workspace member"
    >
      <div className="border-b border-gray-100 p-2">
        <div className="flex items-center gap-2  border border-gray-200 bg-gray-50 px-2 py-1.5">
          <MagnifyingGlass size={12} className="text-gray-400" weight="bold" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="flex-1 bg-transparent text-xs text-gray-700 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {loading ? (
          <p className="px-3 py-2 text-xs text-gray-400">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">No members found</p>
        ) : (
          filtered.map((member) => (
            <button
              key={member.value}
              type="button"
              disabled={submitting}
              onClick={() => handleAssign(member.value)}
              className="flex w-full items-center gap-2  px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center  bg-gray-100 text-[9px] font-bold text-gray-500">
                {member.value[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="truncate">{member.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Status Dropdown ────────────────────────────────────────────────────────

function StatusDropdown({
  entityId,
  moduleType,
  onClose,
  onUpdated,
}: {
  entityId: number | string;
  moduleType: "Bug" | "Task";
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const statuses = STATUS_OPTIONS[moduleType];

  const handleStatusChange = useCallback(
    async (value: string) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/dashboard/quick-action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: moduleType,
            entityId: Number(entityId),
            action: "status",
            value,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update status");
        }
        toast("Status updated successfully", "success");
        onClose();
        onUpdated?.();
        router.refresh();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to update status", "error");
      } finally {
        setSubmitting(false);
      }
    },
    [entityId, moduleType, onClose, onUpdated, router, submitting],
  );

  return (
    <div
      className="absolute right-0 top-full z-50 mt-1 w-44  border border-gray-200 bg-white shadow-md"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Change status"
    >
      <div className="p-1">
        {statuses.map((status) => (
          <button
            key={status.value}
            type="button"
            disabled={submitting}
            onClick={() => handleStatusChange(status.value)}
            className="flex w-full items-center gap-2  px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <Check size={10} weight="bold" className="text-gray-300" />
            <span>{status.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
