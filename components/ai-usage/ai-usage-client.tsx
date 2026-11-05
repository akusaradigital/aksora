"use client";

import { useEffect, useState } from "react";
import { Robot } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";
import { TokensChart } from "./tokens-chart";

type Row = { key: string; calls: number; tokens: number; failures: number; avgDurationMs: number };
type Usage = { totals: Omit<Row, "key">; series: Row[] };

const PRESETS = [7, 30, 90] as const;
// Local calendar date as YYYY-MM-DD (date-fns is not installed).
const ymd = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);
const num = (n: number) => n.toLocaleString();
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

async function fetchUsage(from: string, to: string, groupBy: string): Promise<Usage> {
  const res = await fetch(`/api/ai/usage?from=${from}&to=${to}&groupBy=${groupBy}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Failed to load AI usage.");
  return json.data;
}

function UsageTable({ title, label, rows }: { title: string; label: string; rows: Row[] }) {
  return (
    <div className="border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-3">{label}</th>
              <th className="px-6 py-3 text-right">Calls</th>
              <th className="px-6 py-3 text-right">Tokens</th>
              <th className="px-6 py-3 text-right">Failures</th>
              <th className="px-6 py-3 text-right">Avg time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-6 py-3 font-mono text-[11px] font-semibold text-slate-800">{r.key}</td>
                <td className="px-6 py-3 text-right tabular-nums">{num(r.calls)}</td>
                <td className="px-6 py-3 text-right tabular-nums">{num(r.tokens)}</td>
                <td className={`px-6 py-3 text-right tabular-nums ${r.failures ? "font-semibold text-rose-700" : ""}`}>{num(r.failures)}</td>
                <td className="px-6 py-3 text-right tabular-nums">{secs(r.avgDurationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AiUsageClient() {
  const [to, setTo] = useState(() => ymd(new Date()));
  const [from, setFrom] = useState(() => ymd(subDays(new Date(), 29)));
  const [data, setData] = useState<{ day: Usage; feature: Usage; model: Usage } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchUsage(from, to, "day"), fetchUsage(from, to, "feature"), fetchUsage(from, to, "model")])
      .then(([day, feature, model]) => {
        if (!cancelled) setData({ day, feature, model });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load AI usage.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const today = ymd(new Date());
  const activePreset = PRESETS.find((d) => to === today && from === ymd(subDays(new Date(), d - 1)));
  const applyPreset = (days: number) => {
    setTo(today);
    setFrom(ymd(subDays(new Date(), days - 1)));
  };
  const totals = data?.day.totals;
  const inputCls = "mt-1 block h-9 border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex" role="group" aria-label="Date range">
          {PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => applyPreset(d)}
              aria-pressed={activePreset === d}
              className={`-ml-px h-9 border px-3 text-xs font-bold first:ml-0 ${activePreset === d ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {d}d
            </button>
          ))}
        </div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          From
          <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          To
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className={inputCls} />
        </label>
      </div>

      {error && <InlineAlert variant="error" message={error} />}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : !data || !totals || totals.calls === 0 ? (
        !error && (
          <div className="flex flex-col items-center justify-center border border-slate-200 bg-white py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400">
              <Robot size={24} weight="bold" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">No AI calls in this range</h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Usage shows up here once someone runs an AI feature, such as generating test cases or checking a screenshot.
            </p>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Calls", value: num(totals.calls) },
              { label: "Tokens", value: num(totals.tokens) },
              { label: "Failures", value: `${num(totals.failures)} (${Math.round((totals.failures / totals.calls) * 100)}%)` },
              { label: "Avg time", value: secs(totals.avgDurationMs) },
            ].map((kpi) => (
              <div key={kpi.label} className="border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-700">Tokens per day</h3>
            <div className="h-64">
              <TokensChart data={data.day.series} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <UsageTable title="By feature" label="Feature" rows={data.feature.series} />
            <UsageTable title="By model" label="Model" rows={data.model.series} />
          </div>
        </>
      )}
    </div>
  );
}
