import { getProjectData } from"@/lib/data";
import { PageShell } from"@/components/layout/page-shell";
import { Badge } from"@/components/shared/badge";
import Link from"next/link";
import {
 FolderSimple,
 Target,
 Bug,
 ListChecks,
 CheckCircle,
 XCircle,
 Warning,
 Clock,
 ArrowRight,
 Note,
 Table,
 Play,
 ArrowSquareOut,
 CaretRight,
} from"@phosphor-icons/react/dist/ssr";
import { cn, formatDate } from"@/lib/utils";

export const dynamic ="force-dynamic";

interface SuiteStats {
 id: string;
 title: string;
 status: string;
 assignee: string;
 publicToken: string;
 total: number;
 passed: number;
 failed: number;
 blocked: number;
 pending: number;
}

interface TestPlan {
 id: string;
 publicToken: string;
 title: string;
 sprint: string;
 status: string;
}

interface BugEntity {
 id: string | number;
 code: string;
 title: string;
 module: string;
 severity: string;
 status: string;
 suggestedDev: string;
 createdAt: string;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ name: string }> }) {
 const { name: encodedName } = await params;
 const projectName = decodeURIComponent(encodedName);

 const rawData = await getProjectData(projectName);
 const data = JSON.parse(JSON.stringify(rawData));

 const stats = data.stats;
 const plans = data.plans as TestPlan[];
 const bugs = data.bugs as BugEntity[];
 const suites = (data.suites || []) as SuiteStats[];

 const passW = stats.totalCases > 0 ? (stats.passed / stats.totalCases) * 100 : 0;
 const failW = stats.totalCases > 0 ? (stats.failed / stats.totalCases) * 100 : 0;
 const blockW = stats.totalCases > 0 ? (stats.blocked / stats.totalCases) * 100 : 0;

 return (
 <PageShell
 icon={<FolderSimple size={22} weight="bold" />}
 title={projectName}
 description={`${stats.totalPlans} test plans · ${stats.totalCases} test cases · ${stats.totalBugs} defects tracked`}
 crumbs={[
 { label:"Dashboard", href:"/dashboard" },
 { label:"Test Plans", href:"/test-plans" },
 { label: projectName },
 ]}
 >

 {/* ── KPI Cards ── */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
 <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
 <div className="flex items-center gap-3 text-slate-500 mb-3">
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
 <Target size={18} weight="bold" className="text-blue-500" />
 </div>
 <h3 className="text-xs font-bold uppercase tracking-wider">Quality Score</h3>
 </div>
 <div className="flex items-end gap-2">
 <span className={cn(
"text-3xl font-black",
 stats.successRate >= 80 ?"text-emerald-600" : stats.successRate >= 60 ?"text-amber-500" :"text-rose-600"
 )}>{stats.successRate}%</span>
 </div>
 <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
 <div style={{ width:`${stats.successRate}%` }} className={cn(
"rounded-full transition-all",
 stats.successRate >= 80 ?"bg-emerald-500" : stats.successRate >= 60 ?"bg-amber-400" :"bg-rose-500"
 )} />
 </div>
 <p className="text-xs font-semibold text-slate-400 mt-2">{stats.passed} / {stats.totalCases} cases passed</p>
 </div>

 <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
 <div className="flex items-center gap-3 text-slate-500 mb-3">
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50">
 <Bug size={18} weight="bold" className="text-rose-500" />
 </div>
 <h3 className="text-xs font-bold uppercase tracking-wider">Open Bugs</h3>
 </div>
 <div className="text-3xl font-black text-slate-900">{stats.openBugs}</div>
 <p className="text-xs font-semibold text-slate-400 mt-2">{stats.totalBugs} total reported</p>
 </div>

 <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
 <div className="flex items-center gap-3 text-slate-500 mb-3">
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
 <ListChecks size={18} weight="bold" className="text-sky-500" />
 </div>
 <h3 className="text-xs font-bold uppercase tracking-wider">Open Tasks</h3>
 </div>
 <div className="text-3xl font-black text-slate-900">{stats.openTasks}</div>
 <p className="text-xs font-semibold text-slate-400 mt-2">{stats.totalTasks} total tasks</p>
 </div>

 <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
 <div className="flex items-center gap-3 text-slate-500 mb-3">
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
 <FolderSimple size={18} weight="bold" className="text-indigo-500" />
 </div>
 <h3 className="text-xs font-bold uppercase tracking-wider">Test Plans</h3>
 </div>
 <div className="text-3xl font-black text-slate-900">{stats.totalPlans}</div>
 <p className="text-xs font-semibold text-slate-400 mt-2">{suites.length} test suites</p>
 </div>
 </div>

 {/* ── Test Cases Breakdown ── */}
 {stats.totalCases > 0 && (
 <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm mb-8">
 <h3 className="text-sm font-bold text-slate-700 mb-3">Test Cases Breakdown</h3>
 <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
 <div style={{ width:`${passW}%` }} className="bg-emerald-500 transition-all" />
 <div style={{ width:`${failW}%` }} className="bg-rose-500 transition-all" />
 <div style={{ width:`${blockW}%` }} className="bg-amber-400 transition-all" />
 </div>
 <div className="mt-3 flex flex-wrap gap-6 text-xs font-semibold">
 <span className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
 <span className="text-slate-500">Passed</span>
 <span className="text-slate-900 font-black">{stats.passed}</span>
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
 <span className="text-slate-500">Failed</span>
 <span className="text-slate-900 font-black">{stats.failed}</span>
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
 <span className="text-slate-500">Blocked</span>
 <span className="text-slate-900 font-black">{stats.blocked}</span>
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
 <span className="text-slate-500">Pending</span>
 <span className="text-slate-900 font-black">{stats.pending}</span>
 </span>
 </div>
 </div>
 )}

 {/* ── Suites Overview ── */}
 {suites.length > 0 && (
 <div className="mb-8">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <Table size={22} weight="bold" className="text-blue-500" />
 Test Suites
 </h3>
 <span className="text-xs font-bold text-slate-400">{suites.length} suites</span>
 </div>
 <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
 {suites.map((suite) => {
 const pct = suite.total > 0 ? Math.round((suite.passed / suite.total) * 100) : 0;
 const hasFailed = suite.failed > 0;
 return (
 <div
 key={suite.id}
 className={cn(
"flex items-center gap-4 p-4 rounded-xl border bg-white transition hover:shadow-md",
 hasFailed ?"border-rose-200" :"border-slate-200"
 )}
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <Link
 href={`/test-suites/${suite.publicToken}`}
 className="text-sm font-bold text-slate-900 hover:text-blue-600 transition truncate"
 >
 {suite.title}
 </Link>
 <Badge value={suite.status} />
 {hasFailed && (
 <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
 <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
 Needs Attention
 </span>
 )}
 </div>
 {suite.assignee && (
 <p className="text-xs text-slate-400">{suite.assignee}</p>
 )}
 </div>

 <div className="hidden sm:flex items-center gap-4 shrink-0">
 <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
 <span className="flex items-center gap-1"><CheckCircle size={13} className="text-emerald-500" />{suite.passed}</span>
 <span className="flex items-center gap-1"><XCircle size={13} className="text-rose-500" />{suite.failed}</span>
 <span className="flex items-center gap-1"><Warning size={13} className="text-amber-500" />{suite.blocked}</span>
 <span className="flex items-center gap-1"><Clock size={13} className="text-slate-400" />{suite.pending}</span>
 </div>
 <div className="w-20">
 <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
 {suite.total > 0 ? (<>
 <div style={{ width:`${(suite.passed / suite.total) * 100}%` }} className="bg-emerald-500" />
 <div style={{ width:`${(suite.failed / suite.total) * 100}%` }} className="bg-rose-500" />
 <div style={{ width:`${(suite.blocked / suite.total) * 100}%` }} className="bg-amber-400" />
 </>) : (
 <div className="w-full bg-slate-200 rounded-full" />
 )}
 </div>
 <p className="mt-0.5 text-right text-[10px] font-bold text-slate-400">{pct}%</p>
 </div>
 <span className="text-xs font-bold text-slate-400 w-16 text-right">{suite.total} cases</span>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <Link
 href={`/test-suites/${suite.publicToken}`}
 className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition"
 >
 <ArrowSquareOut size={12} weight="bold" />
 <span className="hidden md:inline">Manage</span>
 </Link>
 <Link
 href={`/test-execution/${suite.publicToken}`}
 className="flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-black text-white hover:bg-blue-600 transition"
 >
 <Play size={12} weight="fill" />
 <span className="hidden md:inline">Execute</span>
 </Link>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 <div className="grid gap-8 lg:grid-cols-2 mb-8">
 {/* ── Test Plans ── */}
 <section>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <FolderSimple size={22} weight="bold" className="text-blue-500" />
 Test Plans
 </h3>
 <Link href="/test-plans" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
 View All ({plans.length}) <CaretRight size={12} weight="bold" />
 </Link>
 </div>
 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
 {plans.map((plan) => (
 <div
 key={plan.id}
 className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
 >
 <div>
 <div className="font-bold text-slate-900">{plan.title}</div>
 {plan.sprint && <div className="text-xs text-slate-500 mt-1">Sprint: {plan.sprint}</div>}
 </div>
 <div className="flex items-center gap-3">
 <Badge value={plan.status} />
 <Link
 href={`/test-plans/${plan.publicToken}`}
 className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-blue-600"
 >
 View Plan
 </Link>
 </div>
 </div>
 ))}
 {plans.length === 0 && (
 <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
 <p className="text-sm text-slate-400">No test plans found for this project.</p>
 </div>
 )}
 </div>
 </section>

 {/* ── Project Defects ── */}
 <section>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <Bug size={22} weight="bold" className="text-rose-500" />
 Project Defects
 </h3>
 <Link href="/bugs" className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1">
 View All ({bugs.length}) <CaretRight size={12} weight="bold" />
 </Link>
 </div>
 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
 {bugs.slice(0, 6).map((bug) => {
 // eslint-disable-next-line react-hooks/purity
 const daysSince = bug.createdAt ? Math.floor((Date.now() - new Date(bug.createdAt).getTime()) / 86400000) : null;
 return (
 <div
 key={bug.id}
 className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white"
 >
 <div className="flex gap-3 items-start min-w-0 flex-1">
 <span className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">{bug.code}</span>
 <div className="min-w-0">
 <div className="text-sm font-bold text-slate-800 truncate">{bug.title}</div>
 <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
 <span>{bug.module}</span>
 {bug.suggestedDev && (
 <>
 <span className="text-slate-300">&middot;</span>
 <span>{bug.suggestedDev}</span>
 </>
 )}
 {daysSince !== null && daysSince >= 0 && (
 <>
 <span className="text-slate-300">&middot;</span>
 <span className={cn(
 daysSince > 14 ?"text-rose-500 font-semibold" : daysSince > 7 ?"text-amber-500" :""
 )}>
 {daysSince === 0 ?"Today" : daysSince === 1 ?"1 day ago" :`${daysSince}d ago`}
 </span>
 </>
 )}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0 ml-3">
 <Badge value={bug.status} />
 <Badge value={bug.severity} />
 </div>
 </div>
 );
 })}
 {bugs.length === 0 && (
 <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
 <p className="text-sm text-slate-400">No bugs reported for this project.</p>
 </div>
 )}
 </div>
 </section>
 </div>

 {/* ── Meeting Notes ── */}
 <section className="mb-20">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-2">
 <div className="h-8 w-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-500">
 <Note size={20} weight="bold" />
 </div>
 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Meeting Notes</h2>
 </div>
 <Link href="/meeting-notes" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
 Meeting Notes <ArrowRight size={14} />
 </Link>
 </div>

 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 {(data.meetings as any[]).slice(0, 6).map((meet: any) => (
 <div key={meet.id} className="group p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-lg transition-all">
 <div className="flex items-center justify-between mb-3">
 <span className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{meet.code}</span>
 <span className="text-xs font-bold text-slate-400">{formatDate(meet.date)}</span>
 </div>
 <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[48px]">
 {meet.title}
 </h3>
 <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
 <Link href="/meeting-notes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500">
 Read Full Notes
 </Link>
 </div>
 </div>
 ))}
 {(data.meetings as any[]).length === 0 && (
 <div className="col-span-full py-10 text-center rounded-xl border border-dashed border-slate-200">
 <p className="text-sm text-slate-400">No meeting notes found for this project.</p>
 </div>
 )}
 </div>
 </section>
 </PageShell>
 );
}

