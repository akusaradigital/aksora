"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagicWand, Record as RecordIcon, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { GenerateCaseDialog } from "./generate-case-dialog";

export type RecordingRow = {
  id: number;
  title: string;
  startUrl: string;
  status: "draft" | "generated" | "failed";
  steps: number;
  createdAt: string;
  testCaseId: number | null;
  testCasePublicToken: string | null;
  tcId: string | null;
};

const STATUS_TONE: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  generated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

export function RecordingsClient({ suites }: { suites: { id: number; title: string }[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<RecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<RecordingRow | null>(null);
  const [deleting, setDeleting] = useState<RecordingRow | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/recordings", { cache: "no-store" });
      const j = await r.json();
      if (r.ok) setRows(j.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async () => {
    if (!deleting) return;
    const r = await fetch(`/api/recordings/${deleting.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) toast(j.error || "Could not delete", "error");
    else { toast("Recording deleted.", "success"); setRows((prev) => prev.filter((x) => x.id !== deleting.id)); }
    setDeleting(null);
  };

  return (
    <div className="w-full space-y-6">
      <div className="border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recordings</h3>
          <p className="mt-1 text-xs text-slate-500">
            Install the recorder from <code className="bg-slate-100 px-1 font-mono">extensions/recorder</code>, set your Aksora URL and an API key, then press Start on any page.
          </p>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400"><RecordIcon size={22} weight="bold" /></div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">No recordings yet</h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">Recordings you stop in the extension show up here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Steps</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Recorded</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="max-w-xs px-6 py-4">
                      <p className="truncate font-semibold text-slate-800">{r.title}</p>
                      <p className="truncate font-mono text-[11px] text-slate-500" title={r.startUrl}>{r.startUrl}</p>
                    </td>
                    <td className="px-6 py-4">{r.steps}</td>
                    <td className="px-6 py-4">
                      <span className={cn("border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[r.status] ?? STATUS_TONE.draft)}>{r.status}</span>
                      {r.testCasePublicToken && (
                        <Link href={`/test-cases/detail/${r.testCasePublicToken}`} className="ml-2 text-[11px] font-semibold text-blue-700 hover:underline">{r.tcId || "Open case"}</Link>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setGenerating(r)} className="inline-flex h-8 items-center gap-1 border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                          <MagicWand size={12} weight="bold" />
                          {r.status === "generated" ? "Generate again" : "Generate test case"}
                        </button>
                        <button type="button" onClick={() => setDeleting(r)} className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${r.title}`}>
                          <Trash size={13} weight="bold" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {generating && (
        <GenerateCaseDialog
          recording={generating}
          suites={suites}
          onClose={() => setGenerating(null)}
          onDone={() => { setGenerating(null); void load(); router.refresh(); }}
        />
      )}
      <ConfirmModal
        isOpen={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete recording?"
        message={`"${deleting?.title ?? ""}" will be removed. Test cases already generated from it stay.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
