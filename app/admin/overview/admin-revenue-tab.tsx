"use client";

import { useEffect, useState } from "react";
import { TrendUp, TrendDown } from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { LoadingSkeleton } from "./admin-shared";

type RevenueData = {
  mrr: number; arr: number; churnRevenue: number; conversionRate: number; expiringCount: number;
  revenueByPlan: { plan: string; count: number; pricePerMonth: number; revenue: number }[];
  revenueHistory: { month: string; revenue: number }[];
  planPrices: Record<string, number>;
};

export function RevenueTab() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/revenue").then((r) => r.json()).then((j) => { if (j?.data) setData(j.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-sm text-gray-500">Failed to load revenue data.</p>;

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const formatShort = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
  const lastTwo = data.revenueHistory.slice(-2);
  const momGrowth = lastTwo.length === 2 && lastTwo[0].revenue > 0
    ? Math.round(((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100) : 0;
  const PIE_COLORS = ["#94a3b8", "#3b82f6", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-700">
          <p className="text-[10px] font-semibold uppercase opacity-70">MRR</p>
          <p className="text-xl font-bold">{formatCurrency(data.mrr)}</p>
          {momGrowth !== 0 && (
            <div className={`mt-1 flex items-center gap-1 text-[10px] font-semibold ${momGrowth > 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {momGrowth > 0 ? <TrendUp size={10} weight="bold" /> : <TrendDown size={10} weight="bold" />}
              {momGrowth > 0 ? "+" : ""}{momGrowth}% MoM
            </div>
          )}
        </div>
        <div className="border border-blue-100 bg-blue-50 px-4 py-4 text-blue-700">
          <p className="text-[10px] font-semibold uppercase opacity-70">ARR</p>
          <p className="text-xl font-bold">{formatCurrency(data.arr)}</p>
        </div>
        <div className="border border-rose-100 bg-rose-50 px-4 py-4 text-rose-700">
          <p className="text-[10px] font-semibold uppercase opacity-70">Churn Loss</p>
          <p className="text-xl font-bold">{formatCurrency(data.churnRevenue)}</p>
          <p className="text-[10px] opacity-60">Lost monthly revenue</p>
        </div>
        <div className="border border-violet-100 bg-violet-50 px-4 py-4 text-violet-700">
          <p className="text-[10px] font-semibold uppercase opacity-70">Conversion</p>
          <p className="text-xl font-bold">{data.conversionRate}%</p>
          <p className="text-[10px] opacity-60">{data.expiringCount} expiring soon</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-gray-800">Revenue by Plan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="pb-2 pr-4">Plan</th><th className="pb-2 pr-4">Companies</th><th className="pb-2 pr-4">Price/Month</th><th className="pb-2 pr-4">Revenue/Month</th><th className="pb-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.revenueByPlan.map((p) => {
                  const share = data.mrr > 0 ? Math.round((p.revenue / data.mrr) * 100) : 0;
                  return (
                    <tr key={p.plan} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-bold text-gray-800 capitalize">{p.plan}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{p.count}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{formatCurrency(p.pricePerMonth)}</td>
                      <td className="py-2.5 pr-4 font-bold text-gray-800">{formatCurrency(p.revenue)}</td>
                      <td className="py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-16 bg-gray-100 overflow-hidden rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${share}%` }} /></div><span className="text-[10px] text-gray-500">{share}%</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="border border-gray-200 bg-white p-5 flex flex-col items-center justify-center">
          <h2 className="mb-2 text-sm font-bold text-gray-800">Plan Mix</h2>
          {data.revenueByPlan.length > 0 ? (
            <ResponsiveContainer height={160} className="w-full">
              <PieChart>
                <Pie data={data.revenueByPlan} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={2}>
                  {data.revenueByPlan.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v, name) => [`${v} companies`, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-gray-400">No data</p>}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {data.revenueByPlan.map((p, i) => (
              <div key={p.plan} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] font-medium text-gray-600 capitalize">{p.plan}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-gray-800">Revenue Trend (6 Months)</h2>
        {data.revenueHistory.length > 0 ? (
          <ResponsiveContainer height={200} className="w-full">
            <AreaChart data={data.revenueHistory} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v: number) => formatShort(v)} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} labelFormatter={(v) => `Month: ${v}`} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="py-8 text-center text-xs text-gray-400">No data</p>}
      </section>
    </div>
  );
}
