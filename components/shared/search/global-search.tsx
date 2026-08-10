"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useCallback, type KeyboardEvent as ReactKeyboardEvent } from"react";
import { createPortal } from"react-dom";
import { useRouter } from"next/navigation";
import { ArrowRight, ArrowSquareOut, Bug, CalendarBlank, CaretLeft, CaretRight, Checks, CircleNotch, ClipboardText, ClockCounterClockwise, CopySimple, Kanban, MagnifyingGlass, Note, PlayCircle, RocketLaunch, SlidersHorizontal, Table, User, X } from"@phosphor-icons/react";
import { cn, formatDisplayText } from"@/lib/utils";
import { toast } from"@/components/ui/toast";
import { buildSearchParams, groupResults, RECENT_LIMIT, RECENTS_KEY, SEARCH_SCOPES, SCOPE_KEY, readStringArray } from"./global-search-queries";
import { GlobalSearchResults } from"./global-search-results";
import type { SearchResponse, SearchResult, SearchScope } from"./global-search-types";

function ResultSkeleton() {
 return (
 <div className="overflow-hidden  border border-gray-200 bg-white">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="flex items-start gap-3 border-b border-gray-100 px-3 py-2.5 last:border-b-0 animate-pulse">
 <div className="mt-0.5 flex shrink-0 flex-col gap-1.5">
 <div className="h-4 w-14  bg-gray-200" />
 <div className="h-3 w-10 rounded bg-gray-100" />
 </div>
 <div className="flex-1 space-y-1.5 pt-0.5">
 <div className="h-4 w-3/4 rounded bg-gray-200" />
 <div className="h-3 w-1/2 rounded bg-gray-100" />
 </div>
 </div>
 ))}
 </div>
 );
}

const scopeColors: Record<SearchScope, { idle: string; active: string }> = {
 all: { idle:"border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700", active:"border-gray-400 bg-gray-100 text-gray-800" },
"test-plans": { idle:"border-indigo-200 bg-indigo-50 text-indigo-600 hover:border-indigo-300 hover:text-indigo-700", active:"border-indigo-400 bg-indigo-100 text-indigo-800" },
"test-suites": { idle:"border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:text-emerald-700", active:"border-emerald-400 bg-emerald-100 text-emerald-800" },
"test-cases": { idle:"border-sky-200 bg-sky-50 text-sky-600 hover:border-sky-300 hover:text-sky-700", active:"border-sky-400 bg-sky-100 text-sky-800" },
 bugs: { idle:"border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:text-rose-700", active:"border-rose-400 bg-rose-100 text-rose-800" },
 tasks: { idle:"border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:text-amber-700", active:"border-amber-400 bg-amber-100 text-amber-800" },
"test-sessions": { idle:"border-cyan-200 bg-cyan-50 text-cyan-600 hover:border-cyan-300 hover:text-cyan-700", active:"border-cyan-400 bg-cyan-100 text-cyan-800" },
"meeting-notes": { idle:"border-violet-200 bg-violet-50 text-violet-600 hover:border-violet-300 hover:text-violet-700", active:"border-violet-400 bg-violet-100 text-violet-800" },
 sprints: { idle:"border-orange-200 bg-orange-50 text-orange-600 hover:border-orange-300 hover:text-orange-700", active:"border-orange-400 bg-orange-100 text-orange-800" },
 deployments: { idle:"border-teal-200 bg-teal-50 text-teal-600 hover:border-teal-300 hover:text-teal-700", active:"border-teal-400 bg-teal-100 text-teal-800" },
 assignees: { idle:"border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:text-gray-700", active:"border-gray-400 bg-gray-100 text-gray-800" },
 users: { idle:"border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:text-gray-700", active:"border-gray-400 bg-gray-100 text-gray-800" },
 activity: { idle:"border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:text-gray-700", active:"border-gray-400 bg-gray-100 text-gray-800" },
};

export function GlobalSearch({
 triggerClassName,
 triggerLabel ="Search...",
 triggerShortcut ="⌘K",
 compactTrigger = false,
}: {
 triggerClassName?: string;
 triggerLabel?: string;
 triggerShortcut?: string;
 compactTrigger?: boolean;
}) {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState("");
 const [scope, setScope] = useState<SearchScope>("all");
 const [status, setStatus] = useState("");
 const [assignee, setAssignee] = useState("");
 const [from, setFrom] = useState("");
 const [to, setTo] = useState("");
 const [showFilters, setShowFilters] = useState(false);
 const [results, setResults] = useState<SearchResult[]>([]);
 const [recentQueries, setRecentQueries] = useState<string[]>([]);
 const [loading, setLoading] = useState(false);
 const [mounted, setMounted] = useState(false);
 const [activeIndex, setActiveIndex] = useState(-1);
 const [draggingScopes, setDraggingScopes] = useState(false);
 const [scopeDragStartX, setScopeDragStartX] = useState(0);
 const [scopeDragStartScroll, setScopeDragStartScroll] = useState(0);
 const [scopeCanScrollLeft, setScopeCanScrollLeft] = useState(false);
 const [scopeCanScrollRight, setScopeCanScrollRight] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);
 const scopeRef = useRef<HTMLDivElement>(null);
 const resultsRef = useRef<HTMLDivElement>(null);
 const activeItemRef = useRef<HTMLDivElement>(null);
 const router = useRouter();
 const deferredQuery = useDeferredValue(query);

 useEffect(() => {
 setMounted(true);
 try {
 const storedScope = window.localStorage.getItem(SCOPE_KEY);
 if (storedScope && SEARCH_SCOPES.some((option) => option.value === storedScope)) {
 setScope(storedScope as SearchScope);
 }
 setRecentQueries(readStringArray(window.localStorage.getItem(RECENTS_KEY)).slice(0, RECENT_LIMIT));
 } catch {
 // ignore
 }
 }, []);

 useEffect(() => {
 const handler = (event: KeyboardEvent) => {
 if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() ==="k") {
 event.preventDefault();
 setOpen(true);
 setTimeout(() => inputRef.current?.focus(), 40);
 }
 if (event.key ==="Escape") setOpen(false);
 };
 window.addEventListener("keydown", handler);
 return () => window.removeEventListener("keydown", handler);
 }, []);

 useEffect(() => {
 if (!open) return;
 setTimeout(() => inputRef.current?.focus(), 40);
 }, [open]);

 const updateScopeFade = useCallback(() => {
 const node = scopeRef.current;
 if (!node) return;
 setScopeCanScrollLeft(node.scrollLeft > 4);
 setScopeCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 4);
 }, []);

 useEffect(() => {
 const node = scopeRef.current;
 if (!node) return;
 updateScopeFade();
 node.addEventListener("scroll", updateScopeFade, { passive: true });
 const ro = new ResizeObserver(updateScopeFade);
 ro.observe(node);
 return () => { node.removeEventListener("scroll", updateScopeFade); ro.disconnect(); };
 }, [open, updateScopeFade]);

 useEffect(() => {
 const trimmedQuery = deferredQuery.trim();
 if (!trimmedQuery || trimmedQuery.length < 2) {
 setResults([]);
 setLoading(false);
 setActiveIndex(-1);
 return;
 }

 const controller = new AbortController();
 const timeout = setTimeout(async () => {
 setLoading(true);
 try {
 const params = buildSearchParams({ query: trimmedQuery, scope, status, assignee, from, to });
 const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
 if (!res.ok) throw new Error(`Search failed (${res.status})`);
 const data = (await res.json()) as SearchResponse;
 const nextResults = Array.isArray(data.results) ? data.results : [];
 setResults(nextResults);
 setActiveIndex(nextResults.length > 0 ? 0 : -1);
 } catch {
 if (!controller.signal.aborted) {
 setResults([]);
 setActiveIndex(-1);
 }
 } finally {
 if (!controller.signal.aborted) setLoading(false);
 }
 }, 160);

 return () => {
 controller.abort();
 clearTimeout(timeout);
 };
 }, [deferredQuery, scope, status, assignee, from, to]);

 const groupedResults = useMemo(() => groupResults(results), [results]);
 const flatResults = useMemo(() => groupedResults.flatMap((group) => group.items), [groupedResults]);
 const activeResult = activeIndex >= 0 ? flatResults[activeIndex] ?? null : null;
 const scopeLabel = SEARCH_SCOPES.find((item) => item.value === scope)?.label ??"All";

 useEffect(() => {
 activeItemRef.current?.scrollIntoView({ block:"nearest", behavior:"smooth" });
 }, [activeIndex]);

 useEffect(() => {
 try {
 window.localStorage.setItem(SCOPE_KEY, scope);
 } catch {
 // ignore
 }
 }, [scope]);

 function rememberQuery(value: string) {
 const normalized = value.trim();
 if (!normalized) return;
 setRecentQueries((prev) => {
 const next = [normalized, ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, RECENT_LIMIT);
 try {
 window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
 } catch {
 // ignore
 }
 return next;
 });
 }

 function openResult(result?: SearchResult | null) {
 if (!result) return;
 rememberQuery(query);
 setOpen(false);
 router.push(result.href);
 }

 function openResultNewTab(result?: SearchResult | null) {
 if (!result) return;
 rememberQuery(query);
 window.open(result.href,"_blank","noopener,noreferrer");
 }

 function copyCode(code: string) {
 if (!navigator.clipboard?.writeText) {
 toast("Clipboard is unavailable.","error");
 return;
 }
 navigator.clipboard.writeText(code).then(
 () => toast("Code copied.","success"),
 () => toast("Failed to copy code.","error"),
 );
 }

 function scrollScopes(direction:"left" |"right") {
 const node = scopeRef.current;
 if (!node) return;
 node.scrollBy({ left: direction ==="left" ? -240 : 240, behavior:"smooth" });
 }

 function startScopeDrag(event: React.PointerEvent<HTMLDivElement>) {
 const node = scopeRef.current;
 if (!node) return;
 if (event.target !== event.currentTarget) return;
 node.setPointerCapture(event.pointerId);
 setDraggingScopes(true);
 setScopeDragStartX(event.clientX);
 setScopeDragStartScroll(node.scrollLeft);
 }

 function moveScopeDrag(event: React.PointerEvent<HTMLDivElement>) {
 if (!draggingScopes) return;
 const node = scopeRef.current;
 if (!node) return;
 event.preventDefault();
 node.scrollLeft = scopeDragStartScroll - (event.clientX - scopeDragStartX);
 }

 function stopScopeDrag() {
 setDraggingScopes(false);
 }

 function clearRecentQueries() {
 setRecentQueries([]);
 try {
 window.localStorage.removeItem(RECENTS_KEY);
 } catch {
 // ignore
 }
 }

 function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
 if (event.key ==="Escape") {
 setOpen(false);
 return;
 }
 if (flatResults.length === 0) return;
 if (event.key ==="ArrowDown") {
 event.preventDefault();
 setActiveIndex((current) => Math.min(flatResults.length - 1, Math.max(0, current + 1)));
 } else if (event.key ==="ArrowUp") {
 event.preventDefault();
 setActiveIndex((current) => Math.max(0, current - 1));
 } else if (event.key ==="Enter") {
 event.preventDefault();
 const target = activeResult ?? flatResults[0];
 if (event.ctrlKey || event.metaKey) openResultNewTab(target);
 else openResult(target);
 }
 }

 const filterSummary = [
 status &&`Status: ${formatDisplayText(status)}`,
 assignee &&`Assignee: ${formatDisplayText(assignee)}`,
 from &&`From: ${from}`,
 to &&`To: ${to}`,
 ].filter(Boolean).join(" ·");

 const modal = (
 <div className="fixed inset-0 z-[500] flex items-start justify-center px-3 pt-[6vh]">
 <button type="button" aria-label="Close search" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/55" />
 <div className="relative z-[501] w-full max-w-4xl overflow-hidden border border-gray-200 bg-white shadow-md">
 <div className="border-b border-gray-100 px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center bg-sky-50 text-sky-600"><MagnifyingGlass size={16} weight="bold" /></div><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400">Global Search</p><p className="mt-0.5 text-xs text-gray-500">Fast search. Filters are behind More.</p></div></div></div>
 <div className="space-y-3 px-4 py-3">
 <div className="flex items-center gap-2"><div className="flex flex-1 items-center gap-2 border border-gray-200 bg-white px-3 py-2.5"><MagnifyingGlass size={15} weight="bold" className="shrink-0 text-gray-400" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search..." autoComplete="off" autoCorrect="off" spellCheck="false" className="w-full border-none bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-none focus:outline-none focus:ring-0" />{query && (<button type="button" onClick={() => setQuery("")} className="p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"><X size={14} weight="bold" /></button>)}</div><div className="border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 shadow-sm">{scopeLabel}</div><button type="button" onClick={() => setShowFilters((current) => !current)} className="inline-flex h-10 items-center gap-1.5 border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm hover:border-sky-300 hover:text-sky-700"><SlidersHorizontal size={13} weight="bold" />More</button></div>
 <div className="relative"><button type="button" onClick={() => scrollScopes("left")} aria-label="Scroll scopes left" className={cn("flex h-8 w-8 shrink-0 items-center justify-center self-center border shadow-sm transition-all", scopeCanScrollLeft ? "border-gray-200 bg-white text-gray-500 hover:border-sky-400 hover:text-sky-700" : "border-gray-100 bg-white text-gray-300 cursor-default")}><CaretLeft size={12} weight="bold" /></button><div ref={scopeRef} className={cn("flex items-center gap-2 overflow-x-auto scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", draggingScopes ? "cursor-grabbing" : "cursor-grab")}>{SEARCH_SCOPES.map((option) => { const active = option.value === scope; return <button key={option.value} type="button" onClick={() => setScope(option.value)} className={cn("inline-flex h-8 items-center whitespace-nowrap border px-3 text-xs font-semibold leading-none transition", active ? scopeColors[option.value].active : scopeColors[option.value].idle)}>{option.label}</button>; })}</div><button type="button" onClick={() => scrollScopes("right")} aria-label="Scroll scopes right" className={cn("flex h-8 w-8 shrink-0 items-center justify-center self-center border shadow-sm transition-all", scopeCanScrollRight ? "border-gray-200 bg-white text-gray-500 hover:border-sky-400 hover:text-sky-700" : "border-gray-100 bg-white text-gray-300 cursor-default")}><CaretRight size={12} weight="bold" /></button></div>
 {showFilters && (<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Status" className="h-9 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none placeholder:text-gray-400 transition-all focus:ring-0" /><input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Assignee" className="h-9 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none placeholder:text-gray-400 transition-all focus:ring-0" /><input value={from} onChange={(event) => setFrom(event.target.value)} type="date" className="h-9 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none transition-all focus:ring-0" /><input value={to} onChange={(event) => setTo(event.target.value)} type="date" className="h-9 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none transition-all focus:ring-0" /></div>)}
 <div><div className="min-w-0">{!query.trim() ? (<div className="space-y-3 flex-1 flex flex-col">{recentQueries.length > 0 ? (<><div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-400"><div className="flex items-center gap-2"><ClockCounterClockwise size={13} weight="bold" />Recent searches</div><button type="button" onClick={clearRecentQueries} className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 shadow-sm hover:border-rose-300 hover:text-rose-600" aria-label="Clear recent searches" title="Clear recent searches"><X size={11} weight="bold" />Clear</button></div><div className="flex flex-wrap gap-2">{recentQueries.map((item) => (<button key={item} type="button" onClick={() => setQuery(item)} className="border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm hover:border-sky-400 hover:text-sky-700">{item}</button>))}</div></>) : (<div className="flex flex-1 items-center border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-500">Search once to populate recent queries.</div>)}</div>) : loading ? (<div className="space-y-2"><div className="flex items-center gap-2 px-1 pb-1"><CircleNotch size={12} className="animate-spin text-gray-400" weight="bold" /><span className="text-xs text-gray-400">Searching&hellip;</span></div><ResultSkeleton /></div>) : flatResults.length === 0 ? (<div className="border border-dashed border-gray-200 bg-white px-4 py-6"><p className="text-sm font-semibold text-gray-700">No results for <span className="text-sky-600">&ldquo;{query}&rdquo;</span></p><p className="mt-1 text-xs text-gray-500">Try:</p><ul className="mt-2 space-y-1 text-xs text-gray-500">{scope !== "all" && (<li><button type="button" onClick={() => setScope("all")} className="text-sky-600 hover:underline">Switch to All scopes</button>{""} instead of &ldquo;{scopeLabel}&rdquo;</li>)}{(status || assignee || from || to) && (<li><button type="button" onClick={() => { setStatus(""); setAssignee(""); setFrom(""); setTo(""); }} className="text-sky-600 hover:underline">Clear active filters</button>{""} (status / assignee / date)</li>)}<li>Try a shorter or different keyword</li><li>Check spelling</li></ul></div>) : (<div ref={resultsRef} className="max-h-[52vh] space-y-2 overflow-y-auto pr-1"><GlobalSearchResults groupedResults={groupedResults} query={query} activeIndex={activeIndex} activeItemRef={activeItemRef} onCopyCode={copyCode} onOpenNewTab={openResultNewTab} onOpenResult={openResult} onSelectIndex={setActiveIndex} /></div>)}</div></div>
 </div>
 <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-[11px] text-gray-400"><p>{results.length > 0 ? `${results.length} result${results.length !== 1 ? "s" : ""}` : "Ready to search"}</p><div className="hidden items-center gap-3 sm:flex">{activeIndex >= 0 && <span>Selected: <span className="font-semibold text-gray-600">{activeResult?.code ?? "-"}</span></span>}<span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-bold">↑↓</kbd> navigate</span><span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-bold">Enter</kbd> open</span><span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-bold">⌘↵</kbd> new tab</span></div></div>
 </div>
 </div>
 )

 return (
 <>
 <button
 type="button"
 onClick={() => setOpen(true)}
 className={cn(
"flex w-full max-w-[min(22rem,calc(100vw-2rem))] items-center gap-2  border border-gray-200 bg-white px-4 py-2 text-sm text-gray-400 shadow-sm transition hover:border-sky-300  sm:w-auto",
 triggerClassName,
 )}
 >
 <MagnifyingGlass size={15} weight="bold" />
 <span className={cn("hidden flex-1 truncate text-left sm:inline", compactTrigger &&"hidden")}>{triggerLabel}</span>
 <kbd className={cn("hidden  border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 sm:inline", compactTrigger &&"hidden")}>
 {triggerShortcut}
 </kbd>
 </button>

 {mounted && open && createPortal(modal, document.body)}
 </>
 );
}
