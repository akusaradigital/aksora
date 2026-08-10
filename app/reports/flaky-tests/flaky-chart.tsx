"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

interface ProjectBreakdownItem {
  project: string;
  count: number;
  avgRate: number;
}

export function FlakyProjectChart({ data }: { data: ProjectBreakdownItem[] }) {
  if (data.length === 0) return null;

  return (
    <div className="border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Flaky Tests by Project</h3>
      <ResponsiveContainer width="100%" height={180} minWidth={200} minHeight={80}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="project" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb" }}
            formatter={(value: unknown, name: unknown) => [
              name === "count" ? `${value} tests` : `${value}%`,
              name === "count" ? "Flaky Count" : "Avg Rate",
            ]}
          />
          <Bar dataKey="count" name="count" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.avgRate >= 60 ? "#ef4444" : entry.avgRate >= 40 ? "#f97316" : "#f59e0b"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
