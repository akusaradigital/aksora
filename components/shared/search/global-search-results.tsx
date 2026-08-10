import { ArrowRight, ArrowSquareOut, ClipboardText, Checks, PlayCircle, Bug, Kanban, Table, Note, RocketLaunch, CalendarBlank, ClockCounterClockwise, User, X, CopySimple } from"@phosphor-icons/react";
import { HighlightText } from"@/components/shared/highlight-text";
import { formatDisplayText } from"@/lib/utils";
import type { SearchResult, SearchResultGroup, SearchScope } from"./global-search-types";

const typeColors: Record<string, string> = {
 Tasks:"bg-amber-100 text-amber-700",
 Bugs:"bg-rose-100 text-rose-700",
 "Test Plans":"bg-indigo-100 text-indigo-700",
 "Test Suites":"bg-emerald-100 text-emerald-700",
 "Test Cases":"bg-sky-100 text-sky-700",
 "Test Sessions":"bg-cyan-100 text-cyan-700",
 "Meeting Notes":"bg-violet-100 text-violet-700",
 Sprints:"bg-orange-100 text-orange-700",
 Assignees:"bg-gray-100 text-gray-700",
 Users:"bg-gray-100 text-gray-700",
 "Deployment Log":"bg-teal-100 text-teal-700",
 "Daily Log":"bg-gray-100 text-gray-600",
};

const typeIcons: Record<string, React.ReactNode> = {
 Tasks: <Kanban size={12} weight="bold" />,
 Bugs: <Bug size={12} weight="bold" />,
 "Test Plans": <ClipboardText size={12} weight="bold" />,
 "Test Suites": <Table size={12} weight="bold" />,
 "Test Cases": <Checks size={12} weight="bold" />,
 "Test Sessions": <PlayCircle size={12} weight="bold" />,
 "Meeting Notes": <Note size={12} weight="bold" />,
 Sprints: <RocketLaunch size={12} weight="bold" />,
 Assignees: <User size={12} weight="bold" />,
 Users: <User size={12} weight="bold" />,
 "Deployment Log": <CalendarBlank size={12} weight="bold" />,
 "Daily Log": <ClockCounterClockwise size={12} weight="bold" />,
};

type GlobalSearchResultsProps = {
 groupedResults: SearchResultGroup[];
 query: string;
 activeIndex: number;
 activeItemRef: React.RefObject<HTMLDivElement | null>;
 onCopyCode: (code: string) => void;
 onOpenNewTab: (result: SearchResult) => void;
 onOpenResult: (result: SearchResult) => void;
 onSelectIndex: (index: number) => void;
};

export function GlobalSearchResults({
 groupedResults,
 query,
 activeIndex,
 activeItemRef,
 onCopyCode,
 onOpenNewTab,
 onOpenResult,
 onSelectIndex,
}: GlobalSearchResultsProps) {
 let runningIndex = 0;
 return (
  <div className="space-y-2">
   {groupedResults.map((group) => (
    <div key={group.group} className="space-y-1">
     <div className="flex items-center justify-between px-1">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{group.group}</h3>
      <span className="text-[10px] text-gray-400">{group.items.length}</span>
     </div>
     <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">
      {group.items.map((result) => {
       const currentIndex = runningIndex++;
       const isActive = currentIndex === activeIndex;
       const icon = typeIcons[result.type] ?? <Note size={12} weight="bold" />;
       return (
        <div
         key={result.id}
         ref={isActive ? activeItemRef : null}
         data-search-index={currentIndex}
         className={"group border-b border-gray-100 last:border-b-0" + (isActive ? " bg-sky-50/60" : "")}
        >
         <button type="button" onClick={() => onSelectIndex(currentIndex)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-sky-50">
          <span className={"mt-0.5 inline-flex min-w-16 items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" + (typeColors[result.type] ? ` ${typeColors[result.type]}` : " bg-gray-100 text-gray-600")}>
           {icon}
           {formatDisplayText(result.type)}
          </span>
          <span className="text-[11px] font-semibold text-gray-400">{result.code}</span>
          <div className="min-w-0 flex-1">
           <p className="truncate text-sm font-semibold text-gray-900"><HighlightText text={result.label} query={query} linkify={false} /></p>
           <p className="mt-0.5 truncate text-xs text-gray-500">{result.sublabel}</p>
          </div>
         </button>
         <div className="flex shrink-0 items-center gap-1 pr-1">
          <button type="button" onClick={() => onCopyCode(result.code)} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Copy code"><CopySimple size={14} weight="bold" /></button>
          <button type="button" onClick={() => onOpenNewTab(result)} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-600" aria-label="Open in new tab"><ArrowSquareOut size={14} weight="bold" /></button>
          <button type="button" onClick={() => onOpenResult(result)} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600" aria-label="Open result"><ArrowRight size={14} weight="bold" /></button>
         </div>
        </div>
       );
      })}
     </div>
    </div>
   ))}
  </div>
 );
}
