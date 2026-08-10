"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { SEVERITY_COLORS } from "./report-types";

type SessionTrendEntry = {
  date: string;
  sessions: number;
  passed: number;
  failed: number;
  blocked: number;
  totalCases: number;
};

type SeverityEntry = { name: string; count: number };
type ProjectEntry = { name: string; count: number };

export function ExecutionTrendChart({ data }: { data: SessionTrendEntry[] }) {
  if (data.length === 0) {
    return (
      <div className=" border border-dashed border-gray-200 p-8 text-sm text-gray-500">
        No execution data this period.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)" }} />
        <Bar dataKey="passed" stackId="sessions" radius={[4, 4, 0, 0]} fill="#16a34a" />
        <Bar dataKey="failed" stackId="sessions" fill="#dc2626" />
        <Bar dataKey="blocked" stackId="sessions" radius={[0, 0, 4, 4]} fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SeverityChart({ data }: { data: SeverityEntry[] }) {
  if (data.length === 0) {
    return (
      <div className=" border border-dashed border-gray-200 p-8 text-sm text-gray-500">
        No severity data.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
      <BarChart data={data} margin={{ left: -10, right: 4, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name.toLowerCase()] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProjectChart({ data }: { data: ProjectEntry[] }) {
  if (data.length === 0) {
    return (
      <div className=" border border-dashed border-gray-200 p-8 text-sm text-gray-500">
        No test plan data.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)" }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}
