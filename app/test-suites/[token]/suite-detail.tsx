"use client";

import { useState, useMemo } from"react";
import Link from"next/link";
import { cn, formatDate, formatDisplayText } from"@/lib/utils";
import { Badge } from"@/components/shared/badge";
import { Breadcrumb } from"@/components/layout/breadcrumb";
import {
 Play,
 CheckCircle,
 XCircle,
 Warning,
 Clock,
 ArrowLeft,
 ArrowSquareOut,
 User,
 ClipboardText,
 CalendarBlank,
 FunnelSimple,
 MagnifyingGlass,
 Checks,
 TrendUp,
 TrendDown,
 Minus,
 Tag,
} from"@phosphor-icons/react";

type TestCase = {
 id: number;
 tcId: string;
 caseName: string;
 assignee?: string;
 typeCase: string;
 status: string;
 priority: string;
 actualResult: string;
 preCondition: string;
 testStep: string;
 expectedResult: string;
};

type Session = {
 id: number;
 date: string;
 tester: string;
 sprint: string;
 project: string;
 totalCases: number;
 passed: number;
 failed: number;
 blocked: number;
 result: string;
 notes: string;
};

type Plan = {
 id: string;
 title: string;
 project: string;
 sprint: string;
 publicToken: string;
};

type Suite = {
 id: string;
 title: string;
 status: string;
 assignee: string;
 notes: string;
 publicToken: string;
 testPlanId: string;
};

const STATUS_PILL: Record<string, string> = {
 Passed:"text-emerald-600 bg-emerald-50 border-emerald-200",
 Failed:"text-rose-600 bg-rose-50 border-rose-200",
 Blocked:"text-amber-600 bg-amber-50 border-amber-200",
 Pending:"text-slate-500 bg-slate-50 border-slate-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
 Passed: <CheckCircle size={12} weight="fill" className="text-emerald-500" />,
 Failed: <XCircle size={12} weight="fill" className="text-rose-500" />,
 Blocked: <Warning size={12} weight="fill" className="text-amber-500" />,
 Pending: <Clock size={12} weight="fill" className="text-slate-400" />,
};

const PRIORITY_DOT: Record<string, string> = {
 High:"bg-rose-500",
 Medium:"bg-amber-400",
 Low:"bg-slate-300",
};

const RESULT_STYLE: Record<string, string> = {
 pass:"text-emerald-600 bg-emerald-50 border-emerald-200",
 fail:"text-rose-600 bg-rose-50 border-rose-200",
 blocked:"text-amber-600 bg-amber-50 border-amber-200",
};

export function SuiteDetail({
 suite,
 cases,
 sessions,
 plan,
}: {
 suite: Suite;
 cases: TestCase[];
 sessions: Session[];
 plan: Plan | null;
}) {
 const [filterStatus, setFilterStatus] = useState("All");
 const [search, setSearch] = useState("");
 const [activeTab, setActiveTab] = useState<"cases" |"history">("cases");

 const total = cases.length;
 const passed = cases.filter((c) => c.status ==="Passed").length;
 const failed = cases.filter((c) => c.status ==="Failed").length;
 const blocked = cases.filter((c) => c.status ==="Blocked").length;
 const pending = cases.filter((c) => c.status ==="Pending" || !c.status).length;
 const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
 const passW = total > 0 ? (passed / total) * 100 : 0;
 const failW = total > 0 ? (failed / total) * 100 : 0;
 const blockW = total > 0 ? (blocked / total) * 100 : 0;

 const trend = useMemo(() => {
 if (sessions.length < 2) return null;
 const last = Number(sessions[0].passed) / Math.max(Number(sessions[0].totalCases), 1);
 const prev = Number(sessions[1].passed) / Math.max(Number(sessions[1].totalCases), 1);
 if (last > prev) return"up";
 if (last < prev) return"down";
 return"flat";
 }, [sessions]);

 const filteredCases = useMemo(() => {
 return cases.filter((c) => {
 if (filterStatus !=="All" && c.status !== filterStatus) return false;
 if (search) {
 const q = search.toLowerCase();
 return c.caseName?.toLowerCase().includes(q) || c.tcId?.toLowerCase().includes(q);
 }
 return true;
 });
 }, [cases, filterStatus, search]);

 return (
 <div className="space-y-6">

 <Breadcrumb crumbs={[
 { label:"Dashboard", href:"/dashboard" },
 { label:"Test Suites", href:"/test-suites" },
 { label: suite.title },
 ]} />

 {/* ── Hero ── */}
 <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
 <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400" />
 <div className="p-6 md:p-8">
 <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

 {/* Left */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 mb-3">
 <Link href="/test-suites" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition">
 <ArrowLeft size={15} weight="bold" />
 </Link>
 <Badge value={suite.status} />
 {trend ==="up" && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><TrendUp size={14} weight="bold" />Improving</span>}
 {trend ==="down" && <span className="flex items-center gap-1 text-xs font-bold text-rose-500"><TrendDown size={14} weight="bold" />Declining</span>}
 {trend ==="flat" && <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Minus size={14} weight="bold" />Stable</span>}
 </div>

 <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight mb-4">
 {suite.title}
 </h1>

 <div className="flex flex-wrap gap-4 text-sm">
 {plan && (
 <Link href={`/test-plans/${plan.publicToken}`} className="flex items-center gap-1.5 text-blue-600 hover:underline font-semibold">
 <ClipboardText size={13} weight="bold" />
 {plan.title}
 </Link>
 )}
 {plan?.project && (
 <Link href={`/test-plans/projects/${encodeURIComponent(plan.project)}`} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition">
 <Tag size={13} weight="bold" className="text-blue-500" />
 <span className="font-semibold text-slate-700">{plan.project}</span>
 </Link>
 )}
 {suite.assignee && (
 <span className="flex items-center gap-1.5 text-slate-500">
 <User size={13} weight="bold" className="text-slate-400" />
 <span className="font-semibold text-slate-700">{suite.assignee}</span>
 </span>
 )}
 {sessions.length > 0 && (
 <span className="flex items-center gap-1.5 text-slate-500">
 <CalendarBlank size={13} weight="bold" className="text-slate-400" />
 <span className="font-semibold text-slate-700">
 Last run {formatDate(sessions[0].date)}
 </span>
 </span>
 )}
 </div>

 {suite.notes && (
 <p className="mt-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4 max-w-xl">
 {suite.notes}
 </p>
 )}
 </div>

 {/* Right: ring */}
 <div className="shrink-0">
 <div className="relative flex h-28 w-28 items-center justify-center">
 <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100" />
 {total > 0 && <>
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${passW} ${100 - passW}`} strokeLinecap="round" />
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f43f5e" strokeWidth="3" strokeDasharray={`${failW} ${100 - failW}`} strokeDashoffset={`${-passW}`} strokeLinecap="round" />
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${blockW} ${100 - blockW}`} strokeDashoffset={`${-(passW + failW)}`} strokeLinecap="round" />
 </>}
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-2xl font-black text-slate-900">{successRate}%</span>
 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pass</span>
 </div>
 </div>
 </div>
 </div>

 {/* Progress bar + legend */}
 {total > 0 && (
 <div className="mt-6">
 <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
 <div style={{ width:`${passW}%` }} className="bg-emerald-500 transition-all" />
 <div style={{ width:`${failW}%` }} className="bg-rose-500 transition-all" />
 <div style={{ width:`${blockW}%` }} className="bg-amber-400 transition-all" />
 </div>
 <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-400">
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{passed} Passed</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{failed} Failed</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{blocked} Blocked</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" />{pending} Pending</span>
 <span className="ml-auto font-bold text-slate-500">{total} cases · {sessions.length} sessions</span>
 </div>
 </div>
 )}

 {/* Action buttons */}
 <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
 <Link
 href={`/test-execution/${suite.publicToken}`}
 className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-5 text-sm font-black text-white hover:bg-blue-600 transition"
 >
 <Play size={15} weight="fill" />
 Execute Suite
 </Link>
 <Link
 href={`/test-cases/detail/${suite.publicToken}`}
 className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition"
 title="Edit test cases"
 >
 <ArrowSquareOut size={15} weight="bold" />
 Manage Cases
 </Link>
 {plan && (
 <Link
 href={`/test-plans/${plan.publicToken}`}
 className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition"
 >
 <ClipboardText size={15} weight="bold" />
 View Plan
 </Link>
 )}
 </div>
 </div>
 </div>

 {/* ── Tabs ── */}
 <div className="flex items-center gap-1 border-b border-slate-200">
 {([
 { key:"cases", label:`Test Cases (${total})` },
 { key:"history", label:`Session History (${sessions.length})` },
 ] as const).map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={cn(
"h-10 px-4 text-sm font-semibold border-b-2 transition",
 activeTab === tab.key
 ?"border-blue-600 text-blue-600"
 :"border-transparent text-slate-500 hover:text-slate-900"
 )}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* ── Test Cases tab ── */}
 {activeTab ==="cases" && (
 <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
 {/* Filter bar */}
 <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
 <div className="relative">
 <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search cases…"
 className="h-8 rounded-md border border-slate-200 bg-white pl-7 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
 />
 </div>
 <div className="flex items-center gap-1.5">
 <FunnelSimple size={12} className="text-slate-400" />
 {["All","Passed","Failed","Blocked","Pending"].map((s) => (
 <button
 key={s}
 onClick={() => setFilterStatus(s)}
 className={cn(
"h-7 rounded px-2.5 text-[11px] font-semibold transition",
 filterStatus === s
 ?"bg-slate-900 text-white"
 :"text-slate-500 hover:bg-slate-200"
 )}
 >{s}</button>
 ))}
 </div>
 <span className="ml-auto text-[11px] font-semibold text-slate-400">{filteredCases.length} cases</span>
 </div>

 {filteredCases.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
 <Checks size={32} weight="bold" />
 <p className="text-sm font-semibold">No cases found</p>
 </div>
 ) : (
 <div className="max-h-[480px] overflow-y-auto">
 <table className="w-full text-sm border-collapse">
 <thead className="sticky top-0 bg-slate-100 z-10">
 <tr className="border-b border-slate-200">
 <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-[80px]">ID</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Test Case Name</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden md:table-cell w-[160px]">Assignee</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden md:table-cell w-[110px]">Type</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden lg:table-cell w-[90px]">Priority</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-[120px]">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredCases.map((tc) => (
 <tr key={tc.id} className="hover:bg-slate-50/60 transition-colors">
 <td className="px-5 py-3.5 whitespace-nowrap">
 <span className="font-mono text-xs font-bold text-slate-400">{tc.tcId}</span>
 </td>
 <td className="px-3 py-3.5 max-w-xs">
 <p className="truncate font-semibold text-slate-800">{tc.caseName}</p>
 {tc.actualResult && (
 <p className="truncate text-[11px] text-slate-400 mt-0.5">{tc.actualResult}</p>
 )}
 </td>
 <td className="px-3 py-3.5 hidden md:table-cell">
 <span className="text-xs text-slate-500">{tc.assignee || suite.assignee ||"Unassigned"}</span>
 </td>
 <td className="px-3 py-3.5 hidden md:table-cell">
 <span className="text-xs text-slate-500">{formatDisplayText(tc.typeCase)}</span>
 </td>
 <td className="px-3 py-3.5 hidden lg:table-cell">
 <div className="flex items-center gap-1.5">
 <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[tc.priority] ??"bg-slate-300")} />
 <span className="text-xs font-semibold text-slate-500">{formatDisplayText(tc.priority)}</span>
 </div>
 </td>
 <td className="px-3 py-3.5">
 <span className={cn(
"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold",
 STATUS_PILL[tc.status] ?? STATUS_PILL.Pending
 )}>
 {STATUS_ICON[tc.status] ?? STATUS_ICON.Pending}
 {formatDisplayText(tc.status ||"Pending")}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}

 {/* ── Session History tab ── */}
 {activeTab ==="history" && (
 <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
 {sessions.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
 <CalendarBlank size={32} weight="bold" />
 <p className="text-sm font-semibold">No sessions recorded yet</p>
 <p className="text-xs">Execute this suite to start tracking history.</p>
 </div>
 ) : (
 <div className="max-h-[480px] overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-slate-200 z-10">
 <tr className="border-b border-slate-100 bg-slate-50/60">
 <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Tester</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Sprint</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Stats</th>
 <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[100px]">Result</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {sessions.map((s) => {
 const total = Number(s.totalCases) || 0;
 const sp = Number(s.passed) || 0;
 const sf = Number(s.failed) || 0;
 const sb = Number(s.blocked) || 0;
 const rate = total > 0 ? Math.round((sp / total) * 100) : 0;
 return (
 <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
 <td className="px-5 py-3.5">
 <p className="font-semibold text-slate-800">{formatDate(s.date)}</p>
 </td>
 <td className="px-3 py-3.5">
 <div className="flex items-center gap-1.5">
 <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs font-black">
 {s.tester?.[0]?.toUpperCase() ||"?"}
 </div>
 <span className="font-semibold text-slate-700">{s.tester ||"-"}</span>
 </div>
 </td>
 <td className="px-3 py-3.5 hidden sm:table-cell">
 <span className="text-xs text-slate-500">{s.sprint ||"-"}</span>
 </td>
 <td className="px-3 py-3.5">
 <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
 <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" />{sp}</span>
 <span className="flex items-center gap-1"><XCircle size={12} className="text-rose-500" />{sf}</span>
 <span className="flex items-center gap-1"><Warning size={12} className="text-amber-500" />{sb}</span>
 <span className="text-slate-300">·</span>
 <span>{rate}%</span>
 </div>
 {total > 0 && (
 <div className="mt-1.5 flex h-1 w-24 overflow-hidden rounded-full bg-slate-100">
 <div style={{ width:`${(sp / total) * 100}%` }} className="bg-emerald-500" />
 <div style={{ width:`${(sf / total) * 100}%` }} className="bg-rose-500" />
 <div style={{ width:`${(sb / total) * 100}%` }} className="bg-amber-400" />
 </div>
 )}
 </td>
 <td className="px-3 py-3.5">
 <span className={cn(
"inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold capitalize",
 RESULT_STYLE[s.result] ?? RESULT_STYLE.blocked
 )}>
 {s.result ||"-"}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 )}
 </div>
 );
}

