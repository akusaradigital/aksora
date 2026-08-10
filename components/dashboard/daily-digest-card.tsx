"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bug, CalendarBlank, Sparkle, Kanban, ArrowsClockwise, X, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type DigestItem = {
  id: number;
  title: string;
  href: string;
  meta?: string;
};

type DigestPayload = {
  newBugs: DigestItem[];
  assignedItems: DigestItem[];
  statusChanges: DigestItem[];
  upcomingDeadlines: DigestItem[];
  hasData: boolean;
};

const STORAGE_KEY = "qa-digest-dismissed";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isMorning(): boolean {
  return new Date().getHours() < 12;
}

function readDismissedKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDismissedKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // ignore quota / private mode failures
  }
}

/**
 * DailyDigestCard - auto-generated morning summary card.
 * Shown at the top of the dashboard before 12:00 local time, when the user
 * has not dismissed it today and the digest endpoint reports `hasData: true`.
 */
export function DailyDigestCard() {
  const [data, setData] = useState<DigestPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore dismissal state on mount
  useEffect(() => {
    if (!isMorning()) {
      setDismissed(true);
      setLoading(false);
      return;
    }
    if (readDismissedKey() === todayKey()) {
      setDismissed(true);
      setLoading(false);
      return;
    }
    fetchDigest();
  }, []);

  const fetchDigest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/digest");
      if (!res.ok) throw new Error("Failed to load digest");
      const payload = (await res.json()) as DigestPayload;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load digest");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    writeDismissedKey(todayKey());
  };

  if (dismissed) return null;
  if (loading) {
    return (
      <div className=" border border-gray-200 bg-white p-5" data-testid="daily-digest-card-loading">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <Sparkle size={14} weight="bold" /> Preparing your morning digest…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className=" border border-amber-200 bg-amber-50 p-4" data-testid="daily-digest-card-error">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
            <Warning size={14} weight="bold" />
            Unable to load digest right now.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDigest}
              className="inline-flex h-7 items-center gap-1  bg-white px-3 text-xs font-bold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
            >
              <ArrowsClockwise size={11} weight="bold" /> Retry
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-amber-500 hover:text-amber-700"
              aria-label="Dismiss"
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!data || !data.hasData) return null;

  return (
    <section
      className=" border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm"
      data-testid="daily-digest-card"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center  bg-blue-100 text-blue-600">
            <Sparkle size={13} weight="bold" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-900">Morning Digest</h3>
            <p className="text-[11px] text-gray-500">Updates since your last session</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-7 w-7 items-center justify-center  text-gray-400 hover:bg-white hover:text-gray-600"
          aria-label="Dismiss digest"
        >
          <X size={12} weight="bold" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DigestSection
          title="New Bugs"
          icon={<Bug size={12} weight="bold" className="text-rose-500" />}
          items={data.newBugs}
          empty="No new bugs"
        />
        <DigestSection
          title="Your Items"
          icon={<Kanban size={12} weight="bold" className="text-blue-500" />}
          items={data.assignedItems}
          empty="No assigned items"
        />
        <DigestSection
          title="Status Changes"
          icon={<ArrowsClockwise size={12} weight="bold" className="text-amber-500" />}
          items={data.statusChanges}
          empty="No status changes"
        />
        <DigestSection
          title="Upcoming Deadlines"
          icon={<CalendarBlank size={12} weight="bold" className="text-emerald-500" />}
          items={data.upcomingDeadlines}
          empty="No deadlines in 2 days"
        />
      </div>
    </section>
  );
}

function DigestSection({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: DigestItem[];
  empty: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
          {title} {items.length > 0 && <span className="text-gray-400">({items.length})</span>}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 10).map((item) => (
            <li key={`${title}-${item.id}`}>
              <Link
                href={item.href}
                prefetch={false}
                className={cn(
                  "block  px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-white hover:text-blue-700 transition truncate",
                )}
                title={item.title}
              >
                {item.title}
                {item.meta && <span className="ml-1 text-[11px] font-medium text-gray-400">{item.meta}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
