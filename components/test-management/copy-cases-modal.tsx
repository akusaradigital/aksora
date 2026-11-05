"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ModalShell } from "@/components/ui/modal-shell";

type Suite = { id: number; title: string };
type CaseRow = { id: number; tcId: string; caseName: string };

const selectClass =
  "h-9 w-full border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export function CopyCasesButton({ suiteId }: { suiteId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
      >
        <Copy size={18} weight="bold" />
        Copy to suite…
      </button>
      {open && <CopyCasesModal sourceSuiteId={suiteId} onClose={() => setOpen(false)} />}
    </>
  );
}

function CopyCasesModal({ sourceSuiteId, onClose }: { sourceSuiteId: string; onClose: () => void }) {
  const router = useRouter();
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [targetSuiteId, setTargetSuiteId] = useState("");
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    void (async () => {
      const [casesRes, suitesRes] = await Promise.all([
        fetch(`/api/test-cases/copy?suiteId=${encodeURIComponent(sourceSuiteId)}`).then((r) => r.json()).catch(() => ({})),
        fetch("/api/test-cases/copy").then((r) => r.json()).catch(() => ({})),
      ]);
      const list: CaseRow[] = casesRes.data || [];
      setCases(list);
      setSelected(new Set(list.map((c) => c.id)));
      setSuites((suitesRes.data || []).filter((s: Suite) => String(s.id) !== sourceSuiteId));
    })();
  }, [sourceSuiteId]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copy = async () => {
    setCopying(true);
    try {
      const res = await fetch("/api/test-cases/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCaseIds: [...selected], targetSuiteId: Number(targetSuiteId) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Copy failed.");
      toast(`Copied ${json.data.copied} cases`, "success");
      router.refresh();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Copy failed.", "error");
    } finally {
      setCopying(false);
    }
  };

  const allSelected = cases !== null && cases.length > 0 && selected.size === cases.length;

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Copy cases to another suite"
      description="Copies get new IDs that continue the target suite's numbering. Results and history are not copied."
      maxWidth="lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={copying || selected.size === 0 || !targetSuiteId}
            className="h-9 bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {copying ? "Copying..." : `Copy ${selected.size} cases`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="copy-target" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Target suite</label>
          <select id="copy-target" value={targetSuiteId} onChange={(e) => setTargetSuiteId(e.target.value)} className={selectClass}>
            <option value="">Choose a suite</option>
            {suites.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>

        {cases === null ? (
          <div className="h-24 animate-pulse bg-slate-100" />
        ) : cases.length === 0 ? (
          <p className="text-xs text-slate-600">This suite has no cases to copy.</p>
        ) : (
          <div className="border border-slate-200">
            <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(cases.map((c) => c.id)))} />
              Select all ({cases.length})
            </label>
            <div className="max-h-72 overflow-y-auto">
              {cases.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-start gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" className="mt-0.5" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="shrink-0 font-mono text-[11px] text-slate-500">{c.tcId}</span>
                  <span>{c.caseName}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
