"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Buildings, Users, Bug, Kanban, Checks, CaretDown, CaretUp,
  Crown, UserCircle, Circle, Lightning, ChartLineUp,
  Warning, MagnifyingGlass, ArrowsClockwise,
} from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { getRoleLabel } from "@/lib/roles";
import { LoadingSkeleton, MetricCard, ActionBtn, UsagePill } from "./admin-shared";
import { formatDate, timeAgo } from "./admin-utils";

type CompanyDetail = {
  id: number; name: string; plan: string; planExpiry: string | null;
  maxUsers: number; status: string; createdAt: string;
  totalUsers: number; totalBugs: number; totalTasks: number;
  totalTestCases: number; totalSprints: number;
  lastActivityAt: string | null; mau: number; health: "green" | "yellow" | "red";
};
type RoleDistribution = { role: string; count: number };
type GrowthData = { month: string; count: number };
type OverviewData = {
  systemTotals: { totalCompanies: number; totalUsers: number; totalBugs: number; totalTasks: number; totalTestCases: number };
  companies: CompanyDetail[]; roleDistribution: RoleDistribution[]; growthData: GrowthData[];
  alerts: { company: string; companyId: number; type: "expired" | "expiring"; daysLeft: number; plan: string }[];
};

export function OverviewTab() {
  const _router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterHealth, setFilterHealth] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = useCallback(() => {
    fetch("/api/admin/overview")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => { if (j?.data) setData(j.data); setLastRefresh(new Date()); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const interval = setInterval(loadData, 60000); return () => clearInterval(interval); }, [loadData]);

  const handleAction = async (action: string, companyId: number, value?: string | number) => {
    setActionLoading(`${action}-${companyId}`);
    try { const r = await fetch("/api/admin/overview", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, companyId, value }) }); if (r.ok) loadData(); }
    catch {} setActionLoading(null);
  };

  const filteredCompanies = useMemo(() => {
    if (!data) return [];
    return data.companies.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPlan !== "all" && c.plan !== filterPlan) return false;
      if (filterHealth !== "all" && c.health !== filterHealth) return false;
      return true;
    });
  }, [data, search, filterPlan, filterHealth]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-sm text-gray-500">Failed to load data.</p>;

  const activeCompanies = data.companies.filter((c) => c.status === "active").length;
  const suspendedCompanies = data.companies.filter((c) => c.status === "suspended").length;
  const totalMAU = data.companies.reduce((sum, c) => sum + c.mau, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <span className="text-[10px] text-gray-400">Updated {timeAgo(lastRefresh.toISOString())}</span>
        <button onClick={loadData} className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-blue-600 transition">
          <ArrowsClockwise size={12} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard icon={<Buildings size={18} weight="bold" />} label="Companies" value={data.systemTotals.totalCompanies} color="blue" subtitle={`${activeCompanies} active · ${suspendedCompanies} suspended`} />
        <MetricCard icon={<Users size={18} weight="bold" />} label="Users" value={data.systemTotals.totalUsers} color="emerald" subtitle={`MAU: ${totalMAU}`} />
        <MetricCard icon={<Bug size={18} weight="bold" />} label="Bugs" value={data.systemTotals.totalBugs} color="rose" />
        <MetricCard icon={<Kanban size={18} weight="bold" />} label="Tasks" value={data.systemTotals.totalTasks} color="amber" />
        <MetricCard icon={<Checks size={18} weight="bold" />} label="Test Cases" value={data.systemTotals.totalTestCases} color="violet" />
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <section className="border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Warning size={16} weight="bold" className="text-amber-600" />
            <h2 className="text-sm font-bold text-amber-800">Plan Alerts ({data.alerts.length})</h2>
          </div>
          <div className="space-y-1.5">
            {data.alerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-amber-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${a.type === "expired" ? "bg-rose-500" : "bg-amber-400"}`} />
                  <span className="text-xs font-semibold text-gray-800">{a.company}</span>
                  <span className="text-[10px] text-gray-500 capitalize">({a.plan})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold ${a.type === "expired" ? "text-rose-600" : "text-amber-600"}`}>
                    {a.type === "expired" ? "Expired" : `${a.daysLeft}d left`}
                  </span>
                  <button onClick={() => handleAction("extend_trial", a.companyId)}
                    className="h-5 border border-amber-200 px-1.5 text-[9px] font-semibold text-amber-700 hover:bg-amber-100 transition">
                    Extend
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <ChartLineUp size={16} weight="bold" className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800">Company Growth (6 Months)</h2>
          </div>
          {data.growthData.length > 0 ? (
            <ResponsiveContainer height={160} className="w-full">
              <BarChart data={data.growthData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(v) => `Month: ${v}`} />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} name="New Companies" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-8 text-center text-xs text-gray-400">No data yet</p>}
        </section>
        <section className="border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Crown size={16} weight="bold" className="text-violet-600" />
            <h2 className="text-sm font-bold text-gray-800">Role Distribution</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.roleDistribution.map((r) => {
              const total = data.roleDistribution.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <div key={r.role} className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                  <UserCircle size={14} weight="bold" className="shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-xs text-gray-700">{getRoleLabel(r.role)}</span>
                  <span className="text-[10px] text-gray-400">{pct}%</span>
                  <span className="text-xs font-bold text-gray-900">{r.count}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-gray-800">Companies ({filteredCompanies.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlass size={12} weight="bold" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company..."
                className="h-7 w-44 border border-gray-200 bg-white pl-7 pr-2 text-[11px] outline-none focus:border-blue-400 transition" />
            </div>
            <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)} className="h-7 border border-gray-200 bg-white px-2 text-[11px] outline-none">
              <option value="all">All Plans</option><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
            </select>
            <select value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)} className="h-7 border border-gray-200 bg-white px-2 text-[11px] outline-none">
              <option value="all">All Health</option><option value="green">Healthy</option><option value="yellow">Warning</option><option value="red">Critical</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          {filteredCompanies.map((c) => (
            <CompanyCard key={c.id} company={c} expanded={expandedCompany === c.name}
              onToggle={() => setExpandedCompany(expandedCompany === c.name ? null : c.name)}
              onAction={handleAction} actionLoading={actionLoading} />
          ))}
          {filteredCompanies.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              {search || filterPlan !== "all" || filterHealth !== "all" ? "No companies match filters." : "No companies yet."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Company Card ────────────────────────────────────────────────────────────
function CompanyCard({ company, expanded, onToggle, onAction, actionLoading }: {
  company: CompanyDetail; expanded: boolean; onToggle: () => void;
  onAction: (action: string, companyId: number, value?: string | number) => void; actionLoading: string | null;
}) {
  const healthColors = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-rose-500" };
  const planColors: Record<string, string> = { free: "bg-gray-100 text-gray-700", pro: "bg-blue-100 text-blue-700", enterprise: "bg-violet-100 text-violet-700" };
  const statusColors: Record<string, string> = { active: "bg-emerald-50 text-emerald-700", suspended: "bg-rose-50 text-rose-700" };
  const capacityPct = company.maxUsers > 0 ? Math.round((company.totalUsers / company.maxUsers) * 100) : 0;

  return (
    <div className="border border-gray-200 bg-white transition hover:border-blue-200">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center bg-blue-50 text-blue-600"><Buildings size={20} weight="bold" /></div>
            <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${healthColors[company.health]}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-800">{company.name}</p>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${planColors[company.plan] || planColors.free}`}>{company.plan}</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold ${statusColors[company.status] || statusColors.active}`}>{company.status}</span>
            </div>
            <p className="text-[11px] text-gray-500">{company.totalUsers}/{company.maxUsers} users · MAU: {company.mau} · Last active: {company.lastActivityAt ? timeAgo(company.lastActivityAt) : "Never"}</p>
          </div>
        </div>
        {expanded ? <CaretUp size={14} weight="bold" className="text-gray-400" /> : <CaretDown size={14} weight="bold" className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between"><p className="text-[10px] font-semibold text-gray-500">User Capacity</p><p className="text-[10px] font-bold text-gray-700">{capacityPct}%</p></div>
            <div className="h-1.5 w-full bg-gray-100 overflow-hidden rounded-full">
              <div className={`h-full rounded-full transition-all ${capacityPct >= 90 ? "bg-rose-500" : capacityPct >= 70 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(capacityPct, 100)}%` }} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Usage</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <UsagePill icon={<Bug size={12} weight="bold" />} label="Bugs" value={company.totalBugs} />
              <UsagePill icon={<Kanban size={12} weight="bold" />} label="Tasks" value={company.totalTasks} />
              <UsagePill icon={<Checks size={12} weight="bold" />} label="Test Cases" value={company.totalTestCases} />
              <UsagePill icon={<Lightning size={12} weight="bold" />} label="Sprints" value={company.totalSprints} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><p className="text-[10px] text-gray-500">Plan Expiry</p><p className="font-semibold text-gray-800">{company.planExpiry || "No expiry"}</p></div>
            <div><p className="text-[10px] text-gray-500">Max Users</p><p className="font-semibold text-gray-800">{company.maxUsers}</p></div>
            <div><p className="text-[10px] text-gray-500">Joined</p><p className="font-semibold text-gray-800">{formatDate(company.createdAt)}</p></div>
            <div><p className="text-[10px] text-gray-500">Health</p><p className="flex items-center gap-1 font-semibold"><Circle size={8} weight="fill" className={company.health === "green" ? "text-emerald-500" : company.health === "yellow" ? "text-amber-400" : "text-rose-500"} /><span className="text-gray-800 capitalize">{company.health}</span></p></div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</p>
            <div className="flex flex-wrap gap-2">
              {company.status === "active"
                ? <ActionBtn label="Suspend" loading={actionLoading === `suspend-${company.id}`} onClick={() => onAction("suspend", company.id)} variant="danger" />
                : <ActionBtn label="Activate" loading={actionLoading === `activate-${company.id}`} onClick={() => onAction("activate", company.id)} variant="success" />}
              <ActionBtn label="Extend +30d" loading={actionLoading === `extend_trial-${company.id}`} onClick={() => onAction("extend_trial", company.id)} variant="default" />
              <ActionBtn label="→ Pro" loading={actionLoading === `update_plan-${company.id}`} onClick={() => onAction("update_plan", company.id, "pro")} variant="default" disabled={company.plan === "pro"} />
              <ActionBtn label="→ Enterprise" loading={actionLoading === `update_plan-${company.id}`} onClick={() => onAction("update_plan", company.id, "enterprise")} variant="default" disabled={company.plan === "enterprise"} />
              <ActionBtn label="+5 Users" loading={actionLoading === `update_quota-${company.id}`} onClick={() => onAction("update_quota", company.id, company.maxUsers + 5)} variant="default" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
