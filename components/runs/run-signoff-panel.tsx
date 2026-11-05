"use client";

import { useCallback, useEffect, useState } from "react";
import { LinkSimple, Trash, UserPlus } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { SignoffDecisionPill, OutcomeBadge } from "@/components/runs/signoff-badges";

type Signoff = { id: number; name: string; email: string; decision: string; comment: string };

export function RunSignoffPanel({ runId }: { runId: number }) {
  const [rows, setRows] = useState<Signoff[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/execution-runs/${runId}/signoffs`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setRows(json.data || []);
  }, [runId]);

  useEffect(() => { void load(); }, [load]);

  const share = async () => {
    const res = await fetch(`/api/execution-runs/${runId}/share`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast(json.error || "Could not create the link", "error");
    await navigator.clipboard?.writeText(json.data.url).catch(() => undefined);
    toast("Client report link copied", "success");
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/execution-runs/${runId}/signoffs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(json.error || "Could not add stakeholder", "error");
    setName(""); setEmail("");
    void load();
  };

  const remove = async (signoffId: number) => {
    const res = await fetch(`/api/execution-runs/${runId}/signoffs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signoffId }),
    });
    if (!res.ok) return toast("Could not remove stakeholder", "error");
    void load();
  };

  const decisions = rows.map((r) => r.decision);
  const input = "h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto flex items-center gap-2 text-sm font-black text-slate-900">
          Stakeholder sign-off <OutcomeBadge decisions={decisions} />
        </h3>
        <button type="button" onClick={share}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
          <LinkSimple size={13} weight="bold" /> Copy client report link
        </button>
      </div>
      <p className="text-xs text-slate-500">Stakeholders approve or reject from the client report link. No login needed.</p>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Stakeholder name" required className={input} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Stakeholder email" type="email" className={input} />
        <button type="submit" disabled={busy || !name.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-bold text-white disabled:opacity-40">
          <UserPlus size={13} weight="bold" /> Add stakeholder
        </button>
      </form>
      {rows.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
              <span className="font-semibold text-slate-800">{r.name}</span>
              {r.email && <span className="text-slate-400">{r.email}</span>}
              <SignoffDecisionPill decision={r.decision} />
              {r.comment && <span className="w-full text-slate-500">{r.comment}</span>}
              {r.decision === "pending" && (
                <button type="button" onClick={() => remove(r.id)} aria-label={`Remove ${r.name}`}
                  className="ml-auto text-slate-400 hover:text-rose-600">
                  <Trash size={14} weight="bold" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
