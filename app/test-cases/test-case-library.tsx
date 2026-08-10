"use client";

import { useEffect, useMemo, useRef, useState } from"react";
import Link from"next/link";
import { cn, formatDisplayText } from"@/lib/utils";
import { Badge } from"@/components/shared/badge";
import {
 CheckCircle,
 XCircle,
 Warning,
 Clock,
 Checks,
 DotsThreeVertical,
 PencilSimple,
 Table,
 DotsSixVertical,
} from"@phosphor-icons/react";
import {
 DndContext,
 DragOverlay,
 closestCenter,
 PointerSensor,
 TouchSensor,
 useSensor,
 useSensors,
 type DragStartEvent,
 type DragEndEvent,
} from "@dnd-kit/core";
import {
 SortableContext,
 verticalListSortingStrategy,
 useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TestCase = {
 id: number;
 tcId: string;
 caseName: string;
 assignee?: string;
 typeCase: string;
 preCondition: string;
 testStep: string;
 expectedResult: string;
 actualResult: string;
 status: string;
 priority: string;
 evidence: string;
 suiteTitle: string | null;
 suiteToken: string | null;
 suiteStatus: string | null;
 suiteAssignee?: string | null;
 planTitle: string | null;
 planProject: string | null;
 testSuiteId: string | number;
};

type SuiteGroup = {
 key: string;
 suiteTitle: string;
 suiteToken: string | null;
 suiteStatus: string | null;
 suiteAssignee: string | null;
 planTitle: string | null;
 planProject: string | null;
 cases: TestCase[];
 passed: number;
 failed: number;
 blocked: number;
 pending: number;
};

const STATUS_PILL: Record<string, string> = {
 Passed:"text-emerald-600 bg-emerald-50 border-emerald-200",
 Failed:"text-rose-600 bg-rose-50 border-rose-200",
 Blocked:"text-amber-600 bg-amber-50 border-amber-200",
 Pending:"text-gray-500 bg-gray-50 border-gray-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
 Passed: <CheckCircle size={12} weight="fill" className="text-emerald-500" />,
 Failed: <XCircle size={12} weight="fill" className="text-rose-500" />,
 Blocked: <Warning size={12} weight="fill" className="text-amber-500" />,
 Pending: <Clock size={12} weight="fill" className="text-gray-400" />,
};

const TYPE_COLOR: Record<string, string> = {
 Positive:"text-teal-600",
 Negative:"text-rose-600",
};

const PRIORITY_COLOR: Record<string, string> = {
 Critical:"text-red-600",
 High:"text-red-500",
 Medium:"text-orange-500",
 Low:"text-gray-500",
};

/* ─── Sortable Test Case Row ─── */
function SortableTestCaseRow({
 testCase,
 index,
 suiteAssignee,
 isDragOverlay = false,
}: {
 testCase: TestCase;
 index: number;
 suiteAssignee: string | null;
 isDragOverlay?: boolean;
}) {
 const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
 } = useSortable({ id: `tc-${testCase.id}` });

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
 };

 return (
  <tr
   ref={setNodeRef}
   style={style}
   {...attributes}
   className={cn(
    "group/row transition-shadow duration-200 hover:bg-gray-50/70",
    isDragging && "opacity-30 bg-gray-100",
    isDragOverlay && "shadow-md bg-white opacity-100 ring-2 ring-sky-400/50",
   )}
  >
   <td className="px-2 py-3.5 align-top w-[36px]">
    <span {...listeners} className="inline-flex cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-500 transition">
     <DotsSixVertical size={14} weight="bold" />
    </span>
   </td>
   <td className="px-3 py-3.5 align-top">
    <span className="font-mono text-xs font-bold text-gray-400">{index + 1}</span>
   </td>
   <td className="max-w-[360px] px-3 py-3.5 align-top">
    <div className="space-y-1">
     <p className="truncate font-semibold text-gray-800">{testCase.caseName}</p>
     {testCase.actualResult && (
      <p className="mt-0 truncate text-xs text-gray-400">{testCase.actualResult}</p>
     )}
    </div>
   </td>
   <td className="hidden px-3 py-3.5 align-top md:table-cell">
    <span className="text-xs font-semibold text-gray-600">
     {testCase.assignee || suiteAssignee ||"Unassigned"}
    </span>
   </td>
   <td className="hidden px-3 py-3.5 align-top md:table-cell">
    <span className={cn("text-xs font-semibold", TYPE_COLOR[testCase.typeCase] ?? "text-gray-500")}>{formatDisplayText(testCase.typeCase)}</span>
   </td>
   <td className="hidden px-3 py-3.5 align-top lg:table-cell">
    <span className={cn("text-xs font-semibold", PRIORITY_COLOR[testCase.priority] ?? "text-gray-500")}>{formatDisplayText(testCase.priority)}</span>
   </td>
   <td className="px-3 py-3.5 align-top">
    <span className={cn("inline-flex items-center gap-1.5  border px-2 py-1 text-xs font-bold", STATUS_PILL[testCase.status] ?? STATUS_PILL.Pending)}>
     {STATUS_ICON[testCase.status] ?? STATUS_ICON.Pending}
     {formatDisplayText(testCase.status ||"Pending")}
    </span>
   </td>
  </tr>
 );
}

function getCaseSortValue(value: string) {
 const match = String(value ??"").match(/(\d+)/);
 return match ? Number.parseInt(match[1] ??"0", 10) : Number.MAX_SAFE_INTEGER;
}

function compareTestCases(a: TestCase, b: TestCase) {
 const aValue = getCaseSortValue(a.tcId);
 const bValue = getCaseSortValue(b.tcId);
 if (aValue !== bValue) return aValue - bValue;
 return String(a.tcId ??"").localeCompare(String(b.tcId ??""), undefined, { numeric: true, sensitivity:"base" });
}

function compareSuiteGroups(a: SuiteGroup, b: SuiteGroup) {
 const aCase = a.cases[0];
 const bCase = b.cases[0];
 if (!aCase && !bCase) return a.suiteTitle.localeCompare(b.suiteTitle);
 if (!aCase) return 1;
 if (!bCase) return -1;
 return compareTestCases(aCase, bCase) || a.suiteTitle.localeCompare(b.suiteTitle);
}

const ALL ="All";
const _STATUS_FILTERS = [ALL,"Passed","Failed","Blocked","Pending"] as const;

/* ─── Sortable Test Case Table ─── */
function TestCaseTable({ displayCases, suiteAssignee }: { displayCases: TestCase[]; suiteAssignee: string | null }) {
 const [localCases, setLocalCases] = useState(displayCases);
 const [activeCase, setActiveCase] = useState<TestCase | null>(null);
 const [activeIndex, setActiveIndex] = useState(-1);

 useEffect(() => { setLocalCases(displayCases); }, [displayCases]);

 const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
 );

 const sortableIds = useMemo(() => localCases.map((c) => `tc-${c.id}`), [localCases]);

 function handleDragStart(event: DragStartEvent) {
  const id = Number(String(event.active.id).replace("tc-", ""));
  const idx = localCases.findIndex((c) => c.id === id);
  if (idx >= 0) {
   setActiveCase(localCases[idx]);
   setActiveIndex(idx);
  }
 }

 function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setActiveCase(null);
  setActiveIndex(-1);
  if (!over || active.id === over.id) return;

  const oldId = Number(String(active.id).replace("tc-", ""));
  const newId = Number(String(over.id).replace("tc-", ""));
  const oldIndex = localCases.findIndex((c) => c.id === oldId);
  const newIndex = localCases.findIndex((c) => c.id === newId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

  setLocalCases((prev) => {
   const next = [...prev];
   const [moved] = next.splice(oldIndex, 1);
   next.splice(newIndex, 0, moved);
   return next;
  });

  // Persist reorder
  fetch("/api/items/test-cases", {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ id: oldId, sortOrder: newIndex + 1 }),
  }).catch(() => {});
 }

 return (
  <DndContext id="tc-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
   <table className="w-full text-sm">
    <thead className="sticky top-0 z-10">
     <tr className="border-b border-gray-100 bg-gray-200">
      <th className="w-[36px] px-2 py-3" />
      <th className="w-[52px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">#</th>
      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Test Case Name</th>
      <th className="hidden w-[160px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 md:table-cell">Assignee</th>
      <th className="hidden w-[120px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 md:table-cell">Type</th>
      <th className="hidden w-[90px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 lg:table-cell">Priority</th>
      <th className="w-[110px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Status</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
     <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
      {localCases.map((testCase, index) => (
       <SortableTestCaseRow key={testCase.id} testCase={testCase} index={index} suiteAssignee={suiteAssignee} />
      ))}
     </SortableContext>
    </tbody>
   </table>
   <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
    {activeCase ? (
     <table className="w-full text-sm">
      <tbody>
       <SortableTestCaseRow testCase={activeCase} index={activeIndex} suiteAssignee={suiteAssignee} isDragOverlay />
      </tbody>
     </table>
    ) : null}
   </DragOverlay>
  </DndContext>
 );
}

export function TestCaseLibrary({ cases, initialSearch ="" }: { cases: TestCase[]; initialSearch?: string }) {
 const [search, _setSearch] = useState(initialSearch);
 const [filterStatus, _setFilterStatus] = useState(ALL);
 const [filterAssignee, _setFilterAssignee] = useState(ALL);
 const [selectedKey, setSelectedKey] = useState<string | null>(null);
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const menuRef = useRef<HTMLDivElement | null>(null);

 const groups = useMemo<SuiteGroup[]>(() => {
 const map = new Map<string, SuiteGroup>();
 cases.forEach((c) => {
 const key = String(c.testSuiteId ??"unassigned");
 if (!map.has(key)) {
 map.set(key, {
 key,
 suiteTitle: c.suiteTitle ||"Unassigned Suite",
 suiteToken: c.suiteToken,
 suiteStatus: c.suiteStatus,
 suiteAssignee: c.suiteAssignee || null,
 planTitle: c.planTitle,
 planProject: c.planProject,
 cases: [],
 passed: 0, failed: 0, blocked: 0, pending: 0,
 });
 }
 const g = map.get(key)!;
 g.cases.push(c);
 const s = c.status;
 if (s ==="Passed") g.passed++;
 else if (s ==="Failed") g.failed++;
 else if (s ==="Blocked") g.blocked++;
 else g.pending++;
 });
 return Array.from(map.values())
 .map((group) => ({ ...group, cases: [...group.cases].sort(compareTestCases) }))
 .sort(compareSuiteGroups);
 }, [cases]);

 const filteredGroups = useMemo(() => {
 return groups
 .map((g) => {
 let filteredCases = g.cases;
 if (filterStatus !== ALL) filteredCases = filteredCases.filter((c) => c.status === filterStatus);
 if (filterAssignee !== ALL) {
 filteredCases = filteredCases.filter((c) => (c.assignee || g.suiteAssignee ||"Unassigned") === filterAssignee);
 }
 if (search) {
 const q = search.toLowerCase();
 filteredCases = filteredCases.filter(
 (c) =>
 c.caseName?.toLowerCase().includes(q) ||
 c.assignee?.toLowerCase().includes(q) ||
 c.suiteTitle?.toLowerCase().includes(q) ||
 c.suiteAssignee?.toLowerCase().includes(q) ||
 c.planTitle?.toLowerCase().includes(q) ||
 c.planProject?.toLowerCase().includes(q) ||
 c.typeCase?.toLowerCase().includes(q) ||
 c.priority?.toLowerCase().includes(q) ||
 c.status?.toLowerCase().includes(q)
 );
 }
 return { ...g, filteredCases };
 })
 .filter((g) => {
 if (search || filterStatus !== ALL || filterAssignee !== ALL) return g.filteredCases.length > 0;
 return true;
 });
 }, [groups, filterStatus, filterAssignee, search]);

 const _assigneeOptions = useMemo(() => {
 const values = new Set<string>();
 cases.forEach((c) => {
 const suiteAssignee = String(c.suiteAssignee ??"").trim();
 const assignee = String(c.assignee ??"").trim();
 if (assignee) values.add(assignee);
 else if (suiteAssignee) values.add(suiteAssignee);
 });
 return [ALL, ...Array.from(values).sort((a, b) => a.localeCompare(b))];
 }, [cases]);

 const selected = filteredGroups.find((g) => g.key === selectedKey) ?? filteredGroups[0] ?? null;
 const displayCases = selected
 ? (filterStatus !== ALL || search
 ? selected.filteredCases
 : selected.cases)
 : [];

 useEffect(() => {
 setIsMenuOpen(false);
 }, [selected?.key]);

 useEffect(() => {
 if (!isMenuOpen) return;
 const handlePointerDown = (event: PointerEvent) => {
 const target = event.target as Node | null;
 if (target && menuRef.current?.contains(target)) return;
 setIsMenuOpen(false);
 };
 const handleEscape = (event: KeyboardEvent) => {
 if (event.key ==="Escape") setIsMenuOpen(false);
 };
 document.addEventListener("pointerdown", handlePointerDown);
 document.addEventListener("keydown", handleEscape);
 return () => {
 document.removeEventListener("pointerdown", handlePointerDown);
 document.removeEventListener("keydown", handleEscape);
 };
 }, [isMenuOpen]);

 return (
 <div className="space-y-3 pb-6">
 <div>
 <div className="flex flex-col gap-4 lg:h-[calc(100vh-310px)] lg:min-h-[500px] lg:flex-row">
 <div className="flex max-h-[320px] w-full shrink-0 flex-col gap-1 overflow-y-auto border-b border-gray-200/70 bg-transparent p-3 lg:h-full lg:max-h-none lg:w-[360px] lg:border-b-0 lg:border-r">
 {filteredGroups.length === 0 ? (
 <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-400">
 <Checks size={32} weight="bold" />
 <p className="text-xs font-semibold">No suites found</p>
 </div>
 ) : (
 filteredGroups.map((group) => {
 const isActive = (selectedKey ?? filteredGroups[0]?.key) === group.key;
 const displayCount = filterStatus !== ALL || search || filterAssignee !== ALL ? group.filteredCases.length : group.cases.length;
 return (
 <button
 key={group.key}
 type="button"
 onClick={() => setSelectedKey(group.key)}
 className={cn(
"w-full  px-4 py-4 text-left transition-all",
 isActive ?"bg-blue-600 text-white shadow-sm shadow-blue-500/20" :"hover:bg-gray-50",
 )}
 >
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 {group.planProject && (
 <p className={cn("mb-0.5 truncate text-[10px] font-bold uppercase tracking-widest", isActive ?"text-blue-200" :"text-blue-500")}>
 {group.planProject}
 </p>
 )}
 <p className={cn("truncate text-sm font-bold leading-snug", isActive ?"text-white" :"text-gray-800")}>
 {group.suiteTitle}
 </p>
 <p className={cn("mt-0.5 truncate text-[11px] font-semibold", isActive ?"text-blue-200" :"text-gray-400")}>
 {group.planTitle ||"No plan"}
 </p>
 {group.suiteAssignee && (
 <p className={cn("mt-0.5 truncate text-[11px] font-semibold", isActive ?"text-blue-100" :"text-gray-500")}>
 {group.suiteAssignee}
 </p>
 )}
 </div>
 <span className={cn(
"mt-0.5 shrink-0  px-1.5 py-0.5 text-[11px] font-bold",
 isActive ?"bg-white/20 text-white" :"bg-gray-100 text-gray-500",
 )}>
 {displayCount}
 </span>
 </div>
 <div className={cn("mt-2 flex items-center gap-2.5 text-[11px] font-bold", isActive ?"text-blue-200" :"text-gray-400")}>
 <span className="flex items-center gap-1">
 <span className={cn("h-1.5 w-1.5 ", isActive ?"bg-emerald-300" :"bg-emerald-500")} />
 {group.passed}
 </span>
 <span className="flex items-center gap-1">
 <span className={cn("h-1.5 w-1.5 ", isActive ?"bg-rose-300" :"bg-rose-500")} />
 {group.failed}
 </span>
 <span className="flex items-center gap-1">
 <span className={cn("h-1.5 w-1.5 ", isActive ?"bg-amber-300" :"bg-amber-400")} />
 {group.blocked}
 </span>
 {group.cases.length > 0 && (
 <div className="ml-auto flex h-1 flex-1 max-w-[48px] overflow-hidden  bg-white/20">
 <div
 style={{ width:`${(group.passed / group.cases.length) * 100}%` }}
 className={cn("h-full transition-all", isActive ?"bg-emerald-300" :"bg-emerald-500")}
 />
 </div>
 )}
 </div>
 </button>
 );
 })
 )}
 </div>

 <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden">
 {!selected ? (
 <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
 <Table size={40} weight="bold" />
 <p className="text-sm font-semibold">Select a suite to view test cases</p>
 </div>
 ) : (
 <>
 <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
 <div className="min-w-0">
 {selected.planProject && (
 <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-blue-500">
 {selected.planProject}{selected.planTitle ?` ? ${selected.planTitle}` :""}
 </p>
 )}
 <div className="flex items-center gap-2">
 <h2 className="truncate text-base font-bold text-gray-900">{selected.suiteTitle}</h2>
 {selected.suiteStatus && <Badge value={selected.suiteStatus} />}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-gray-400">
 <span className="flex items-center gap-1"><CheckCircle size={13} className="text-emerald-500" />{selected.passed}</span>
 <span className="flex items-center gap-1"><XCircle size={13} className="text-rose-500" />{selected.failed}</span>
 <span className="flex items-center gap-1"><Warning size={13} className="text-amber-500" />{selected.blocked}</span>
 <span className="flex items-center gap-1"><Clock size={13} className="text-gray-400" />{selected.pending}</span>
 </div>
 {(selected.suiteToken || selected.key) && (
 <div ref={menuRef} className="relative">
 <button
 type="button"
 aria-label="Open test case menu"
 aria-expanded={isMenuOpen}
 aria-haspopup="menu"
 onClick={() => setIsMenuOpen((open) => !open)}
 className="flex h-9 w-9 items-center justify-center  border border-gray-200 text-gray-500 transition hover:bg-gray-50"
 >
 <DotsThreeVertical size={18} weight="bold" />
 </button>
 {isMenuOpen && (
 <div className="absolute right-0 top-11 z-20 w-56  border border-gray-200 bg-white p-2 shadow-lg">
 <Link href={`/test-cases/${selected.suiteToken || selected.key}`} className="flex items-center gap-2  px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
 <PencilSimple size={16} weight="bold" />
 Edit Test Case
 </Link>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {displayCases.length === 0 ? (
 <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
 <Checks size={32} weight="bold" />
 <p className="text-sm font-semibold">No cases match this filter</p>
 </div>
 ) : (
 <div className="flex flex-1 flex-col overflow-hidden">
 <div className="grid gap-3 px-4 py-4 md:hidden">
 {displayCases.map((testCase) => (
 <div key={testCase.id} className=" border border-gray-200 bg-white p-4 shadow-sm">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <h3 className="mt-1 truncate text-sm font-bold text-gray-900">{testCase.caseName}</h3>
 <p className="mt-1 text-xs text-gray-500">{testCase.assignee || selected.suiteAssignee ||"Unassigned"}</p>
 </div>
 <span className={cn("inline-flex shrink-0 items-center gap-1.5  border px-2 py-1 text-xs font-bold", STATUS_PILL[testCase.status] ?? STATUS_PILL.Pending)}>
 {STATUS_ICON[testCase.status] ?? STATUS_ICON.Pending}
 {formatDisplayText(testCase.status ||"Pending")}
 </span>
 </div>
 <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
 <span className={TYPE_COLOR[testCase.typeCase] ?? "text-gray-500"}>{formatDisplayText(testCase.typeCase)}</span>
 <span className={PRIORITY_COLOR[testCase.priority] ?? "text-gray-500"}>{formatDisplayText(testCase.priority)}</span>
 </div>
 {testCase.actualResult && (
 <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">{testCase.actualResult}</p>
 )}
 </div>
 ))}
 </div>

 <div className="hidden flex-1 overflow-y-auto md:block">
 <TestCaseTable displayCases={displayCases} suiteAssignee={selected.suiteAssignee} />
 </div>
 </div>
 )}
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 );

}
