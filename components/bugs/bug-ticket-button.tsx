"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowSquareOut, Ticket } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ModalShell } from "@/components/ui/modal-shell";

type TrackerOption = { id: number; name: string; kind: string; enabled: boolean };

export function BugTicketButton({ bugId, externalTicket }: { bugId: number | string; externalTicket?: unknown }) {
  const router = useRouter();
  const [linked, setLinked] = useState(String(externalTicket ?? "").trim());
  const [open, setOpen] = useState(false);
  const [trackers, setTrackers] = useState<TrackerOption[] | null>(null);
  const [trackerId, setTrackerId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const openPicker = async () => {
    setOpen(true);
    if (trackers) return;
    try {
      const res = await fetch("/api/issue-trackers");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load trackers.");
      const enabled = (json.data as TrackerOption[]).filter((t) => t.enabled);
      setTrackers(enabled);
      setTrackerId(enabled[0]?.id ?? null);
    } catch (err) {
      setTrackers([]);
      toast(err instanceof Error ? err.message : "Failed to load trackers.", "error");
    }
  };

  const create = async () => {
    if (!trackerId) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/bugs/${bugId}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackerId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create ticket.");
      setLinked(json.data.externalTicket);
      setOpen(false);
      toast(`Ticket ${json.data.key} created`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create ticket.", "error");
    } finally {
      setCreating(false);
    }
  };

  const isUrl = /^https?:\/\//i.test(linked);

  return (
    <>
      {linked && (
        isUrl ? (
          <a href={linked} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 max-w-[220px] items-center gap-1.5 truncate px-2 text-xs font-semibold text-blue-700 underline-offset-2 hover:underline">
            <ArrowSquareOut size={14} weight="bold" className="shrink-0" />
            <span className="truncate">{linked.replace(/^https?:\/\//i, "")}</span>
          </a>
        ) : (
          <span className="inline-flex h-8 items-center px-2 text-xs font-semibold text-slate-700">Ticket {linked}</span>
        )
      )}
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
      >
        <Ticket size={14} weight="bold" />
        {linked ? "Create another ticket" : "Create ticket"}
      </button>

      <ModalShell
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Create ticket"
        description="Sends the steps, expected and actual results, severity and a link back to this bug."
        maxWidth="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={create} disabled={!trackerId || creating} className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {creating ? "Creating..." : "Create ticket"}
            </button>
          </div>
        }
      >
        {trackers === null ? (
          <div className="h-9 animate-pulse bg-slate-100" />
        ) : trackers.length === 0 ? (
          <p className="text-xs text-slate-600">
            No tracker is connected yet.{" "}
            <Link href="/settings/integrations" className="font-semibold text-blue-700 hover:underline">Connect one in Integrations</Link>.
          </p>
        ) : (
          <div>
            <label htmlFor="ticket-tracker" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Tracker</label>
            <select
              id="ticket-tracker"
              value={trackerId ?? ""}
              onChange={(e) => setTrackerId(Number(e.target.value))}
              className="h-9 w-full border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>
              ))}
            </select>
          </div>
        )}
      </ModalShell>
    </>
  );
}
