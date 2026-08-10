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
 CalendarBlank,
 User,
 Tag,
 ArrowLeft,
 Checks,
 CircleNotch,
 CaretDown,
 ArrowSquareOut,
 MagnifyingGlass,
 FunnelSimple,
 Share,
 Check,
} from"@phosphor-icons/react";

type TestCase = {
 id: number;
 tcId: string;
 caseName: string;
 typeCase: string;
 status: string;
 priority: string;
 actualResult: string;
 preCondition: string;
 testStep: string;
 expectedResult: string;
};

type Suite = {
 id: string;
 token?: string;
 publicToken?: string;
 title: string;
 assignee: string;
 status: string;
 notes?: string;
 cases: TestCase[];
};

type Plan = {
 id: string;
 title: string;
 project: string;
 sprint: string;
 assignee: string;
 status: string;
 startDate: string;
 endDate: string;
 notes: string;
 scope: string;
 publicToken?: string;
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

function suiteReadiness(passed: number, failed: number, blocked: number, total: number) {
 if (total === 0) return { label:"Empty", color:"text-slate-400 bg-slate-50 border-slate-200", dot:"bg-slate-300" };
 if (failed > 0) return { label:"Needs Attention", color:"text-rose-600 bg-rose-50 border-rose-200", dot:"bg-rose-500" };
 if (passed === total) return { label:"All Passed", color:"text-emerald-600 bg-emerald-50 border-emerald-200", dot:"bg-emerald-500" };
 if (blocked > 0) return { label:"Blocked", color:"text-amber-600 bg-amber-50 border-amber-200", dot:"bg-amber-400" };
 return { label:"In Progress", color:"text-blue-600 bg-blue-50 border-blue-200", dot:"bg-blue-500" };
}

const ALL ="All";

export function TestPlanDetail({
 plan,
 suites,
}: {
 plan: Plan;
 suites: Suite[];
}) {
 const [openSuites, setOpenSuites] = useState<Record<string, boolean>>({});
 const [search, setSearch] = useState("");
 const [filterStatusMap, setFilterStatusMap] = useState<Record<string, string>>({});
 const [activeTab, setActiveTab] = useState<"all" |"attention" |"empty">("all");
 const [copied, setCopied] = useState(false);

 const getFilterStatus = (suiteId: string) => filterStatusMap[suiteId] || ALL;
 const setFilterStatus = (suiteId: string, status: string) =>
 setFilterStatusMap((p) => ({ ...p, [suiteId]: status }));

 const copyReportLink = () => {
 if (!plan.publicToken) return;
 const url =`${window.location.origin}/report/${plan.publicToken}`;
 navigator.clipboard.writeText(url).then(() => {
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 });
 };

 const toggleSuite = (id: string) =>
 setOpenSuites((p) => ({ ...p, [id]: !p[id] }));

 const expandAll = () => {
 const next: Record<string, boolean> = {};
 suites.forEach((s) => (next[s.id] = true));
 setOpenSuites(next);
 };
 const collapseAll = () => setOpenSuites({});

 const suitesWithStats = useMemo(() =>
 suites.map((s) => {
 let passed = 0, failed = 0, blocked = 0, pending = 0;
 s.cases.forEach((c) => {
 const st = String(c.status).toLowerCase();
 if (st ==="passed") passed++;
 else if (st ==="failed") failed++;
 else if (st ==="blocked") blocked++;
 else pending++;
 });
 return { ...s, passed, failed, blocked, pending, total: s.cases.length };
 }),
 [suites]
 );

 const totalCases = suitesWithStats.reduce((a, s) => a + s.total, 0);
 const totalPassed = suitesWithStats.reduce((a, s) => a + s.passed, 0);
 const totalFailed = suitesWithStats.reduce((a, s) => a + s.failed, 0);
 const totalBlocked = suitesWithStats.reduce((a, s) => a + s.blocked, 0);
 const totalPending = suitesWithStats.reduce((a, s) => a + s.pending, 0);
 const successRate = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
 const passW = totalCases > 0 ? (totalPassed / totalCases) * 100 : 0;
 const failW = totalCases > 0 ? (totalFailed / totalCases) * 100 : 0;
 const blockW = totalCases > 0 ? (totalBlocked / totalCases) * 100 : 0;

 const tabFiltered = useMemo(() => {
 if (activeTab ==="attention") return suitesWithStats.filter((s) => s.failed > 0);
 if (activeTab ==="empty") return suitesWithStats.filter((s) => s.total === 0);
 return suitesWithStats;
 }, [suitesWithStats, activeTab]);

 const filteredSuites = useMemo(() => {
 if (!search) return tabFiltered;
 const q = search.toLowerCase();
 return tabFiltered.filter(
 (s) =>
 s.title.toLowerCase().includes(q) ||
 s.cases.some((c) => c.caseName?.toLowerCase().includes(q) || c.tcId?.toLowerCase().includes(q))
 );
 }, [tabFiltered, search]);

 const needsAttentionCount = suitesWithStats.filter((s) => s.failed > 0).length;
 const emptyCount = suitesWithStats.filter((s) => s.total === 0).length;

 return (
 <div className="space-y-6">

 <Breadcrumb crumbs={[
 { label:"Dashboard", href:"/dashboard" },
 { label:"Test Plans", href:"/test-plans" },
 { label: plan.title ||"Untitled Plan" },
 ]} />

 {/* ── Hero ── */}
 <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
 <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500" />
 <div className="p-6 md:p-8">
 <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

 {/* Title + meta */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 mb-3">
 <Link href="/test-plans" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition">
 <ArrowLeft size={15} weight="bold" />
 </Link>
 <Badge value={plan.status} />
 {plan.publicToken && (
 <button
 onClick={copyReportLink}
 className="flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 h-8 text-xs font-bold text-violet-600 hover:bg-violet-100 transition"
 >
 {copied ? <Check size={13} weight="bold" /> : <Share size={13} weight="bold" />}
 {copied ?"Copied!" :"Share Report"}
 </button>
 )}
 </div>
 <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight mb-4">
 {plan.title ||"Untitled Plan"}
 </h1>
 <div className="flex flex-wrap gap-4 text-sm">
 {plan.project && (
 <Link href={`/test-plans/projects/${encodeURIComponent(plan.project)}`} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition">
 <Tag size={13} weight="bold" className="text-blue-500" />
 <span className="font-semibold text-slate-700">{plan.project}</span>
 </Link>
 )}
 {plan.sprint && (
 <span className="flex items-center gap-1.5 text-slate-500"><CircleNotch size={13} weight="bold" className="text-indigo-500" /><span className="font-semibold text-slate-700">{plan.sprint}</span></span>
 )}
 {plan.assignee && (
 <span className="flex items-center gap-1.5 text-slate-500"><User size={13} weight="bold" className="text-slate-400" /><span className="font-semibold text-slate-700">{plan.assignee}</span></span>
 )}
 {(plan.startDate || plan.endDate) && (
 <span className="flex items-center gap-1.5 text-slate-500"><CalendarBlank size={13} weight="bold" className="text-slate-400" /><span className="font-semibold text-slate-700">{formatDate(plan.startDate)} - {formatDate(plan.endDate)}</span></span>
 )}
 </div>
 {(plan.scope || plan.notes) && (
 <p className="mt-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4 max-w-2xl">
 {plan.scope || plan.notes}
 </p>
 )}
 </div>

 {/* Ring chart */}
 <div className="shrink-0">
 <div className="relative flex h-28 w-28 items-center justify-center">
 <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
 <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100" />
 {totalCases > 0 && <>
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
 {totalCases > 0 && (
 <div className="mt-6">
 <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
 <div style={{ width:`${passW}%` }} className="bg-emerald-500 transition-all" />
 <div style={{ width:`${failW}%` }} className="bg-rose-500 transition-all" />
 <div style={{ width:`${blockW}%` }} className="bg-amber-400 transition-all" />
 </div>
 <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-400">
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{totalPassed} Passed</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{totalFailed} Failed</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{totalBlocked} Blocked</span>
 <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" />{totalPending} Pending</span>
 <span className="ml-auto font-bold text-slate-500">{suites.length} suites · {totalCases} cases</span>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* ── Suite accordion ── */}
 <div>
 <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
 <div className="flex items-center gap-2">
 {[
 { key:"all" as const, label:"All", count: suitesWithStats.length },
 { key:"attention" as const, label:"Needs Attention", count: needsAttentionCount },
 { key:"empty" as const, label:"Empty", count: emptyCount },
 ].map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={cn(
"h-8 rounded-md px-3 text-xs font-semibold transition",
 activeTab === tab.key
 ?"bg-slate-900 text-white"
 :"bg-slate-100 text-slate-500 hover:bg-slate-200"
 )}
 >{tab.label}{tab.count > 0 ?` (${tab.count})` :""}</button>
 ))}
 </div>

 <div className="flex items-center gap-2">
 <div className="relative">
 <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search suites or cases…"
 className="h-8 rounded-md border border-slate-200 bg-white pl-7 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
 />
 </div>
 <button
 onClick={Object.values(openSuites).some(Boolean) ? collapseAll : expandAll}
 className="h-8 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
 >
 {Object.values(openSuites).some(Boolean) ? "Collapse All" : "Expand All"}
 </button>
 </div>
 </div>

 {filteredSuites.length === 0 ? (
 <div className="rounded-xl border border-dashed border-slate-200 bg-white p-16 text-center">
 <Checks size={36} className="mx-auto mb-3 text-slate-300" weight="bold" />
 <p className="font-bold text-slate-700">No suites found</p>
 <p className="mt-1 text-sm text-slate-500">Try changing the filter or search term.</p>
 </div>
 ) : (
 <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
 {filteredSuites.map((suite) => {
 const ready = suiteReadiness(suite.passed, suite.failed, suite.blocked, suite.total);
 const isOpen = !!openSuites[suite.id];
 const suitePassW = suite.total > 0 ? (suite.passed / suite.total) * 100 : 0;
 const suiteFailW = suite.total > 0 ? (suite.failed / suite.total) * 100 : 0;
 const suiteBlockW = suite.total > 0 ? (suite.blocked / suite.total) * 100 : 0;

 const currentFilter = getFilterStatus(suite.id);
 const visibleCases = currentFilter === ALL
 ? suite.cases
 : suite.cases.filter((c) => c.status === currentFilter);

 return (
 <div key={suite.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
 {/* Suite row */}
 <button
 onClick={() => toggleSuite(suite.id)}
 className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50/80"
 >
 <CaretDown
 size={14}
 weight="bold"
 className={cn("text-slate-400 transition-transform shrink-0", isOpen ?"rotate-0" :"-rotate-90")}
 />

 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <Link href={`/test-suites/${suite.token || suite.publicToken ||""}`} onClick={(e) => e.stopPropagation()} className="text-sm font-bold text-slate-900 hover:text-blue-600 transition">{suite.title}</Link>
 <Badge value={suite.status} />
 <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold", ready.color)}>
 <span className={cn("h-1.5 w-1.5 rounded-full", ready.dot)} />
 {ready.label}
 </span>
 </div>
 {suite.notes && (
 <p className="text-xs text-slate-400 line-clamp-1">{suite.notes}</p>
 )}
 </div>

 {/* Stats */}
 <div className="hidden md:flex items-center gap-4 shrink-0">
 <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
 <span className="flex items-center gap-1"><CheckCircle size={13} className="text-emerald-500" />{suite.passed}</span>
 <span className="flex items-center gap-1"><XCircle size={13} className="text-rose-500" />{suite.failed}</span>
 <span className="flex items-center gap-1"><Warning size={13} className="text-amber-500" />{suite.blocked}</span>
 <span className="flex items-center gap-1"><Clock size={13} className="text-slate-400" />{suite.pending}</span>
 </div>
 <div className="w-20">
 <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
 {suite.total > 0 ? (
 <>
 <div style={{ width:`${suitePassW}%` }} className="bg-emerald-500" />
 <div style={{ width:`${suiteFailW}%` }} className="bg-rose-500" />
 <div style={{ width:`${suiteBlockW}%` }} className="bg-amber-400" />
 </>
 ) : (
 <div className="w-full bg-slate-200 rounded-full" />
 )}
 </div>
 <p className="mt-0.5 text-right text-[10px] font-bold text-slate-400">
 {suite.total > 0 ?`${Math.round(suitePassW)}%` :"0%"}
 </p>
 </div>
 <span className="text-xs font-bold text-slate-400">{suite.total} cases</span>
 </div>

 {/* Action buttons */}
 <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
 <Link
 href={`/test-suites/${suite.token || suite.publicToken ||""}`}
 className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition"
 >
 <ArrowSquareOut size={12} weight="bold" />
 Manage
 </Link>
 <Link
 href={`/test-execution/${suite.token || suite.publicToken ||""}`}
 className="flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-black text-white hover:bg-blue-600 transition"
 >
 <Play size={12} weight="fill" />
 Execute
 </Link>
 </div>
 </button>

 {/* Accordion - test cases */}
 {isOpen && (
 <div className="border-t border-slate-100">
 {/* Case filter bar */}
 <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50/60 border-b border-slate-100">
 <FunnelSimple size={12} className="text-slate-400" />
 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Filter:</span>
 {["All","Passed","Failed","Blocked","Pending"].map((s) => (
 <button
 key={s}
 onClick={() => setFilterStatus(suite.id, s)}
 className={cn(
"h-6 rounded px-2 text-[11px] font-semibold transition",
 currentFilter === s
 ?"bg-slate-900 text-white"
 :"text-slate-500 hover:bg-slate-200"
 )}
 >{s}</button>
 ))}
 <span className="ml-auto text-[10px] font-semibold text-slate-400">{visibleCases.length} shown</span>
 </div>

 {visibleCases.length === 0 ? (
 <div className="py-8 text-center text-sm text-slate-400">No cases match this filter.</div>
 ) : (
 <div className="max-h-[360px] overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-slate-200 z-10">
 <tr className="border-b border-slate-100">
 <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[80px]">ID</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Test Case Name</th>
 <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden md:table-cell w-[100px]">Type</th>
 <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden lg:table-cell w-[90px]">Priority</th>
 <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-[120px]">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {visibleCases.map((tc) => (
 <tr key={tc.id} className="hover:bg-slate-50/60 transition-colors">
 <td className="px-5 py-3 whitespace-nowrap">
 <span className="font-mono text-xs font-bold text-slate-400">{tc.tcId}</span>
 </td>
 <td className="px-3 py-3 max-w-xs">
 <p className="truncate font-semibold text-slate-800">{tc.caseName}</p>
 {tc.actualResult && (
 <p className="truncate text-[11px] text-slate-400 mt-0.5">{tc.actualResult}</p>
 )}
 </td>
 <td className="px-3 py-3 hidden md:table-cell">
 <span className="text-xs text-slate-500">{formatDisplayText(tc.typeCase)}</span>
 </td>
 <td className="px-3 py-3 hidden lg:table-cell">
 <div className="flex items-center gap-1.5">
 <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[tc.priority] ??"bg-slate-300")} />
 <span className="text-xs font-semibold text-slate-500">{formatDisplayText(tc.priority)}</span>
 </div>
 </td>
 <td className="px-3 py-3">
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
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}

