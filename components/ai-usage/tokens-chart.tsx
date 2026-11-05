"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

export function TokensChart({ data }: { data: { key: string; tokens: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={data} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="key" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 0, border: "1px solid var(--border-color)", background: "var(--bg-card)" }} cursor={{ fill: "var(--bg-table-head)" }} />
        <Bar dataKey="tokens" name="Tokens" fill="#2563eb" radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
}
