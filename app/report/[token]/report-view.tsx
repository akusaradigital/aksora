"use client";

import { useState } from"react";
import {
 CheckCircle, XCircle, Warning, Clock, Bug, Printer,
 ChartBar, CalendarBlank, User, Folder, Lightning,
} from"@phosphor-icons/react";
import {
 BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from"recharts";
import { ResponsiveContainer } from"@/components/shared/responsive-container";
import { formatDisplayText } from"@/lib/utils";

type ReportData = {
 plan: {
 id: number; title: string; project: string; sprint: string;
 status: string; startDate?: string; endDate?: string; assignee?: string; notes?: string; code?: string;
 };
 suites: {
 id: number; title: string; status: string; assignee?: string;
 cases: { id: number; code: string; caseName?: string; title?: string; status: string; priority: string }[];
 }[];
 stats: { total: number; passed: number; failed: number; blocked: number; pending: number; passRate: number };
 sessions: { id: number; date: string; tester: string; scope: string; totalCases: number; passed: number; failed: number; blocked: number; result: string }[];
 bugs: { id: number; code: string; title: string; severity: string; status: string }[];
};

const STATUS_COLORS: Record<string, string> = {
 passed:"#10b981", failed:"#f43f5e", blocked:"#f59e0b", pending:"#94a3b8",
 active:"#2563eb", draft:"#94a3b8", completed:"#059669", closed:"#475569",
};

const SEVERITY_COLORS: Record<string, string> = {
 critical:"#dc2626", high:"#f97316", medium:"#facc15", low:"#0ea5e9",
 p0:"#dc2626", p1:"#f97316", p2:"#facc15", p3:"#0ea5e9",
};

function StatusBadge({ status }: { status: string }) {
 const color = STATUS_COLORS[status.toLowerCase()] ??"#94a3b8";
 return (
 <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide"
 style={{ background: color +"20", color }}>
 {formatDisplayText(status)}
 </span>
 );
}

function SeverityBadge({ severity }: { severity: string }) {
 const color = SEVERITY_COLORS[severity.toLowerCase()] ??"#94a3b8";
 return (
 <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
 style={{ background: color +"20", color }}>
 {formatDisplayText(severity)}
 </span>
 );
}

function formatDate(d?: string) {
 if (!d) return"–";
 try { return new Date(d).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" }); }
 catch { return d; }
}

export function ReportView({ data }: { data: ReportData }) {
 const { plan, suites, stats, sessions, bugs } = data;
 const [mounted] = useState(true);

 const suiteChartData = suites.map((s) => {
 const p = s.cases.filter((c) => c.status.toLowerCase() ==="passed").length;
 const f = s.cases.filter((c) => c.status.toLowerCase() ==="failed").length;
 const b = s.cases.filter((c) => c.status.toLowerCase() ==="blocked").length;
 return { name: s.title.length > 16 ? s.title.slice(0, 14) +"…" : s.title, passed: p, failed: f, blocked: b };
 });

 return (
 <div className="min-h-screen bg-slate-50 font-sans">
 {/* Print bar */}
 <div className="print:hidden sticky top-0 z-30 border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
 <div className="flex items-center gap-2 text-sm">
 <ChartBar size={16} className="text-violet-500" weight="bold" />
 <span className="font-black text-slate-800">QA Test Report</span>
 <span className="text-slate-400">·</span>
 <span className="text-slate-500 text-xs">{plan.project}</span>
 </div>
 <button
 onClick={() => window.print()}
 className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:opacity-80 transition"
 >
 <Printer size={13} weight="bold" />
 Print / PDF
 </button>
 </div>

 <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">

 {/* Header */}
 <div className="rounded-2xl border border-slate-200 bg-white p-7">
 <div className="flex items-start justify-between gap-4 flex-wrap">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">Test Plans Report</p>
 <h1 className="text-2xl font-black text-slate-900 leading-tight">{plan.title}</h1>
 {plan.notes && <p className="text-sm text-slate-500 mt-2 max-w-xl">{plan.notes}</p>}
 </div>
 <StatusBadge status={plan.status} />
 </div>
 <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="flex items-center gap-2 text-xs text-slate-500">
 <Folder size={14} weight="bold" className="text-slate-400" />
 <div><span className="block font-bold uppercase tracking-widest text-[11px] text-slate-400">Test Plans</span>{plan.project ||"–"}</div>
 </div>
 <div className="flex items-center gap-2 text-xs text-slate-500">
 <Lightning size={14} weight="bold" className="text-slate-400" />
 <div><span className="block font-bold uppercase tracking-widest text-[11px] text-slate-400">Sprint</span>{plan.sprint ||"–"}</div>
 </div>
 <div className="flex items-center gap-2 text-xs text-slate-500">
 <CalendarBlank size={14} weight="bold" className="text-slate-400" />
 <div><span className="block font-bold uppercase tracking-widest text-[11px] text-slate-400">Period</span>{formatDate(plan.startDate)} – {formatDate(plan.endDate)}</div>
 </div>
 <div className="flex items-center gap-2 text-xs text-slate-500">
 <User size={14} weight="bold" className="text-slate-400" />
 <div><span className="block font-bold uppercase tracking-widest text-[11px] text-slate-400">Assignee</span>{plan.assignee ||"–"}</div>
 </div>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
 {[
 { label:"Total", value: stats.total, color:"#6366f1", icon: <ChartBar size={16} weight="bold" /> },
 { label:"Passed", value: stats.passed, color:"#10b981", icon: <CheckCircle size={16} weight="bold" /> },
 { label:"Failed", value: stats.failed, color:"#f43f5e", icon: <XCircle size={16} weight="bold" /> },
 { label:"Blocked", value: stats.blocked, color:"#f59e0b", icon: <Warning size={16} weight="bold" /> },
 { label:"Pending", value: stats.pending, color:"#94a3b8", icon: <Clock size={16} weight="bold" /> },
 { label:"Pass Rate", value:`${stats.passRate}%`, color: stats.passRate >= 80 ?"#10b981" : stats.passRate >= 60 ?"#f59e0b" :"#f43f5e", icon: <CheckCircle size={16} weight="bold" /> },
 ].map((m) => (
 <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
 <div className="flex justify-center mb-1.5" style={{ color: m.color }}>{m.icon}</div>
 <div className="text-xl font-black" style={{ color: m.color }}>{m.value}</div>
 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{m.label}</div>
 </div>
 ))}
 </div>

 {/* Pass Rate Bar */}
 <div className="rounded-xl border border-slate-200 bg-white p-5">
 <div className="flex justify-between text-xs font-bold mb-2">
 <span className="text-slate-500">Overall Pass Rate</span>
 <span style={{ color: stats.passRate >= 80 ?"#10b981" : stats.passRate >= 60 ?"#f59e0b" :"#f43f5e" }}>
 {stats.passRate}%
 </span>
 </div>
 <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-700"
 style={{
 width:`${stats.passRate}%`,
 background: stats.passRate >= 80 ?"#10b981" : stats.passRate >= 60 ?"#f59e0b" :"#f43f5e",
 }}
 />
 </div>
 <div className="mt-2 flex gap-4 text-[10px] text-slate-400 font-bold">
 <span style={{ color:"#10b981" }}>■ Passed {stats.passed}</span>
 <span style={{ color:"#f43f5e" }}>■ Failed {stats.failed}</span>
 <span style={{ color:"#f59e0b" }}>■ Blocked {stats.blocked}</span>
 <span style={{ color:"#94a3b8" }}>■ Pending {stats.pending}</span>
 </div>
 </div>

 {/* Suite Breakdown Chart */}
 {suiteChartData.length > 0 && (
 <div className="rounded-xl border border-slate-200 bg-white p-5">
 <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-1">Suite Breakdown</h2>
 <p className="text-[10px] text-slate-400 mb-4">Pass / Fail / Blocked per test suite</p>
 <div className="h-48">
 {mounted && (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={suiteChartData} barSize={16}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
 <Tooltip />
 <Bar dataKey="passed" name="Passed" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
 <Bar dataKey="failed" name="Failed" fill="#f43f5e" radius={[0, 0, 0, 0]} stackId="a" />
 <Bar dataKey="blocked" name="Blocked" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="a" />
 </BarChart>
 </ResponsiveContainer>
 )}
 </div>
 </div>
 )}

 {/* Suites Detail */}
 {suites.length > 0 && (
 <div className="rounded-xl border border-slate-200 bg-white p-5">
 <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4">Test Suites ({suites.length})</h2>
 <div className="space-y-3">
 {suites.map((suite) => {
 const p = suite.cases.filter((c) => c.status.toLowerCase() ==="passed").length;
 const f = suite.cases.filter((c) => c.status.toLowerCase() ==="failed").length;
 const total = suite.cases.length;
 const rate = total > 0 ? Math.round((p / total) * 100) : 0;
 return (
 <div key={suite.id} className="rounded-lg border border-slate-100 p-3">
 <div className="flex items-center justify-between gap-2 mb-2">
 <div className="flex items-center gap-2 min-w-0">
 <span className="font-bold text-sm text-slate-800 truncate">{suite.title}</span>
 <StatusBadge status={suite.status} />
 </div>
 <span className="text-xs font-black shrink-0" style={{ color: rate >= 80 ?"#10b981" : rate >= 60 ?"#f59e0b" :"#f43f5e" }}>
 {rate}%
 </span>
 </div>
 <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-1.5">
 <div className="h-full rounded-full" style={{ width:`${rate}%`, background: rate >= 80 ?"#10b981" : rate >= 60 ?"#f59e0b" :"#f43f5e" }} />
 </div>
 <div className="flex gap-3 text-[10px] text-slate-400 font-semibold">
 <span>{total} cases</span>
 <span className="text-emerald-500">{p} passed</span>
 {f > 0 && <span className="text-rose-500">{f} failed</span>}
 {suite.assignee && <span>· {suite.assignee}</span>}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Sessions */}
 {sessions.length > 0 && (
 <div className="rounded-xl border border-slate-200 bg-white p-5">
 <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4">Recent Sessions ({sessions.length})</h2>
 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead className="bg-slate-200">
 <tr className="border-b border-slate-100">
 {["Date","Scope","Tester","Cases","Passed","Failed","Result"].map((h) => (
 <th key={h} className="pb-2 text-left font-bold uppercase tracking-widest text-[11px] text-slate-400">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {sessions.map((s) => (
 <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
 <td className="py-2 text-slate-600">{s.date ? s.date.slice(0, 10) :"–"}</td>
 <td className="py-2 text-slate-700 max-w-[140px] truncate">{s.scope}</td>
 <td className="py-2 text-slate-500">{s.tester}</td>
 <td className="py-2 text-center font-bold text-slate-700">{s.totalCases}</td>
 <td className="py-2 text-center font-bold text-emerald-600">{s.passed}</td>
 <td className="py-2 text-center font-bold text-rose-500">{s.failed}</td>
 <td className="py-2"><StatusBadge status={s.result ||"–"} /></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Active Bugs */}
 {bugs.length > 0 && (
 <div className="rounded-xl border border-slate-200 bg-white p-5">
 <div className="flex items-center gap-2 mb-4">
 <Bug size={15} className="text-rose-400" weight="bold" />
 <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">Open Bugs ({bugs.length})</h2>
 </div>
 <div className="space-y-2">
 {bugs.map((b) => (
 <div key={b.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-50">
 <span className="text-[10px] font-bold text-slate-400 shrink-0">{b.code}</span>
 <span className="text-xs text-slate-700 flex-1 truncate">{b.title}</span>
 <SeverityBadge severity={b.severity} />
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Footer */}
 <div className="text-center text-[10px] text-slate-400 pb-6">
 Generated by Aksora · {new Date().toLocaleDateString("id-ID", { day:"2-digit", month:"long", year:"numeric" })}
 </div>
 </div>
 </div>
 );
}
