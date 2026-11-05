"use client";

import { cn } from "@/lib/utils";

type DiffLine = { kind: "same" | "add" | "del"; text: string };

/** Line diff via LCS. Scripts are a few hundred lines at most, so O(n*m) is fine. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ kind: "same", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ kind: "del", text: a[i++] });
    else out.push({ kind: "add", text: b[j++] });
  }
  while (i < a.length) out.push({ kind: "del", text: a[i++] });
  while (j < b.length) out.push({ kind: "add", text: b[j++] });
  return out;
}

export function ScriptDiff({ before, after }: { before: string; after: string }) {
  const lines = diffLines(before, after);
  const changed = lines.some((l) => l.kind !== "same");
  if (!changed) return <p className="text-xs text-slate-500">The proposed script is identical to the current one.</p>;
  return (
    <pre className="max-h-80 overflow-auto border border-slate-200 bg-slate-50 py-2 font-mono text-[11px] leading-5" aria-label="Script changes">
      {lines.map((l, idx) => (
        <div
          key={idx}
          className={cn(
            "whitespace-pre-wrap px-3",
            l.kind === "add" && "bg-emerald-50 text-emerald-800",
            l.kind === "del" && "bg-rose-50 text-rose-800 line-through decoration-rose-300",
            l.kind === "same" && "text-slate-600",
          )}
        >
          <span className="mr-2 select-none text-slate-400">{l.kind === "add" ? "+" : l.kind === "del" ? "-" : " "}</span>
          {l.text || " "}
        </div>
      ))}
    </pre>
  );
}
