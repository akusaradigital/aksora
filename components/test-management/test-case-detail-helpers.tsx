"use client";

import type { KeyboardEvent, ReactNode } from"react";
import { useEffect, useRef, useState } from"react";
import { createPortal } from"react-dom";
import { CaretDown } from"@phosphor-icons/react";
import { cn } from"@/lib/utils";

export type TestCaseRow = {
 id?: number;
 testSuiteId: string;
 tcId: string;
 caseName: string;
 typeCase: string;
 preCondition: string;
 testStep: string;
 expectedResult: string;
 actualResult?: string;
 status: string;
 evidence: string;
 priority: string;
};

export type FieldKey =
 |"tcId"
 |"caseName"
 |"typeCase"
 |"preCondition"
 |"testStep"
 |"expectedResult"
 |"actualResult"
 |"status"
 |"priority"
 |"evidence";

export const fieldOrder: FieldKey[] = [
"tcId",
"caseName",
"typeCase",
"preCondition",
"testStep",
"expectedResult",
"actualResult",
"status",
"priority",
"evidence",
];

export const typeOptions = ["Positive","Negative"] as const;
export const statusOptions = ["Pending","Passed","Failed","Blocked"] as const;
export const priorityOptions = ["Critical","High","Medium","Low"] as const;

const toneCellClass: Record<string, string> = {
 Positive:"bg-emerald-100 text-emerald-700",
 Negative:"bg-rose-100 text-rose-700",
 Pending:"bg-gray-200 text-gray-700",
 Passed:"bg-emerald-100 text-emerald-700",
 PASSED:"bg-emerald-100 text-emerald-700",
 Success:"bg-emerald-100 text-emerald-700",
 SUCCESS:"bg-emerald-100 text-emerald-700",
 Failed:"bg-red-100 text-red-700",
 FAILED:"bg-red-100 text-red-700",
 Blocked:"bg-yellow-100 text-yellow-800",
 BLOCKED:"bg-yellow-100 text-yellow-800",
 Critical:"bg-red-100 text-red-700",
 High:"bg-orange-100 text-orange-700",
 Medium:"bg-sky-100 text-sky-700",
 Low:"bg-gray-200 text-gray-700",
};

export function getToneClass(fieldKey: string, value: string) {
 if (fieldKey ==="typeCase") return toneCellClass[value] ??"bg-gray-100 text-gray-600";
 if (fieldKey ==="status") return toneCellClass[value] ??"bg-gray-100 text-gray-600";
 if (fieldKey ==="priority") return toneCellClass[value] ??"bg-gray-100 text-gray-600";
 return"";
}

export const COLS = [
 { key:"__drag__", label:"", width: 32 },
 { key:"__row__", label:"#", width: 56 },
 { key:"tcId", label:"Test Case ID", width: 100 },
 { key:"caseName", label:"Test Case Name", width: 220 },
 { key:"typeCase", label:"Type", width: 110 },
 { key:"preCondition", label:"Pre Condition", width: 220 },
 { key:"testStep", label:"Test Step", width: 260 },
 { key:"expectedResult", label:"Expected Result", width: 260 },
 { key:"actualResult", label:"Actual Result", width: 260 },
 { key:"status", label:"Status", width: 120 },
 { key:"priority", label:"Priority", width: 120 },
 { key:"evidence", label:"Evidence", width: 180 },
 { key:"__action__", label:"Action", width: 116 },
] as const;

export const TOTAL_WIDTH = COLS.reduce((sum, column) => sum + column.width, 0);
export const colMap = Object.fromEntries(COLS.map((column) => [column.key, column.width])) as Record<string, number>;

export function Th({ children, w, className }: { children?: ReactNode; w: number; className?: string }) {
 return (
 <th
 style={{ width: w, minWidth: w, maxWidth: w }}
 className={cn(
"border-b border-r border-gray-100 bg-gray-200 px-2 py-[5px] text-left text-xs font-bold uppercase tracking-wide text-gray-700 select-none",
 className,
 )}
 >
 {children}
 </th>
 );
}

export function ReadCell({ value, w, onClick }: { value: string; w: number; onClick?: () => void }) {
 return (
 <td
 style={{ width: w, minWidth: w, maxWidth: w }}
 onClick={onClick}
 className={cn(
"border-b border-r border-gray-100 bg-transparent px-[6px] py-[4px] align-top text-[12px] leading-[1.4] transition-colors",
 onClick ?"cursor-text hover:bg-gray-50" :"text-gray-700",
 )}
 >
 <div className="flex h-full min-h-[28px] items-start whitespace-pre-wrap break-words">
 {value || <span className="text-gray-300">-</span>}
 </div>
 </td>
 );
}

export function BadgeCell({ value, w, fieldKey, onClick }: { value: string; w: number; fieldKey: string; onClick?: () => void }) {
 const toneClass = getToneClass(fieldKey, value);
 return (
 <td
 style={{ width: w, minWidth: w, maxWidth: w }}
 onClick={onClick}
 className={cn(
"border-b border-r border-gray-100 p-0 align-top",
 toneClass ||"bg-transparent",
 )}
 >
 <div className="flex min-h-[28px] h-full w-full items-center px-[6px] py-[4px] text-xs font-bold uppercase tracking-wide">
 <span className={cn("truncate", !value &&"text-gray-400")}>
 {value ||"Select"}
 </span>
 </div>
 </td>
 );
}

export function EditTextCell({
 value,
 w,
 placeholder,
 multiline,
 cellClassName,
 onChange,
 onKeyDown,
 onEnter,
 setRef,
 autoFocus,
}: {
 value: string;
 w: number;
 placeholder?: string;
 multiline?: boolean;
 cellClassName?: string;
 onChange: (v: string) => void;
 onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
 onEnter?: () => void;
 setRef?: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
 autoFocus?: boolean;
}) {
 const sharedClass =
"block h-full w-full flex-1 border-0 bg-transparent px-[6px] py-[4px] text-[12px] leading-[1.4] text-gray-800 outline-none focus:ring-0 placeholder:text-gray-300";
 const innerRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

 function syncMultilineHeight() {
 const el = innerRef.current;
 if (!el || !(el instanceof HTMLTextAreaElement)) return;
 const cell = el.closest("td");
 const cellHeight = cell instanceof HTMLTableCellElement ? cell.clientHeight : 28;
 el.style.height ="0px";
 el.style.height =`${Math.max(el.scrollHeight, cellHeight, 28)}px`;
 }

 useEffect(() => {
 if (!autoFocus || !innerRef.current) return;
 const frame = window.requestAnimationFrame(() => {
 innerRef.current?.focus();
 if ("select" in innerRef.current! && typeof innerRef.current!.select ==="function") {
 innerRef.current!.select();
 }
 });
 return () => window.cancelAnimationFrame(frame);
 }, [autoFocus]);

 useEffect(() => {
 if (!multiline) return;
 const el = innerRef.current;
 if (!el || !(el instanceof HTMLTextAreaElement)) return;

 syncMultilineHeight();

 const cell = el.closest("td");
 if (!cell || typeof ResizeObserver ==="undefined") {
 return;
 }

 const observer = new ResizeObserver(() => {
 syncMultilineHeight();
 });
 observer.observe(cell);
 return () => observer.disconnect();
 }, [multiline, value]);

 function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
 if (e.key ==="Enter" && !e.shiftKey) {
 e.preventDefault();
 onEnter?.();
 return;
 }
 onKeyDown?.(e);
 }

 return (
 <td
 style={{ width: w, minWidth: w, maxWidth: w }}
 onClick={() => innerRef.current?.focus()}
 className={cn("relative border-b border-r border-gray-100 bg-transparent p-0 align-top focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-400", cellClassName)}
 >
 {multiline ? (
 <textarea
 ref={(el) => {
 innerRef.current = el;
 if (setRef) setRef(el);
 }}
 autoFocus={autoFocus}
 value={value}
 placeholder={placeholder}
 rows={1}
 onChange={(e) => onChange(e.target.value)}
 onKeyDown={handleKeyDown as (e: KeyboardEvent<HTMLTextAreaElement>) => void}
 className={cn(sharedClass,"block min-h-[28px] w-full resize-none overflow-hidden")}
 />
 ) : (
 <input
 ref={(el) => {
 innerRef.current = el;
 if (setRef) setRef(el);
 }}
 type="text"
 autoFocus={autoFocus}
 value={value}
 placeholder={placeholder}
 onChange={(e) => onChange(e.target.value)}
 onKeyDown={handleKeyDown as (e: KeyboardEvent<HTMLInputElement>) => void}
 className={cn(sharedClass,"absolute inset-0 h-full w-full")}
 />
 )}
 </td>
 );
}

export function CustomSelect({
 value,
 w,
 fieldKey,
 options,
 placeholder,
 cellClassName,
 onChange,
 onTabKey,
 onEnter,
 setRef,
 autoFocusOpen,
}: {
 value: string;
 w: number;
 fieldKey: string;
 options: readonly string[];
 placeholder?: string;
 cellClassName?: string;
 onChange: (v: string) => void;
 onTabKey?: () => void;
 onEnter?: () => void;
 setRef?: (el: HTMLButtonElement | null) => void;
 autoFocusOpen?: boolean;
}) {
 const [open, setOpen] = useState(false);
 const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
 const btnRef = useRef<HTMLButtonElement | null>(null);
 const listRef = useRef<HTMLUListElement>(null);
 const toneClass = getToneClass(fieldKey, value);

 function openDropdown() {
 if (btnRef.current) {
 const r = btnRef.current.getBoundingClientRect();
 setRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 220) });
 }
 setOpen(true);
 }

 useEffect(() => {
 if (!open) return;

 function close(e: MouseEvent) {
 const target = e.target as Node;
 if (listRef.current && !listRef.current.contains(target) && btnRef.current && !btnRef.current.contains(target)) {
 setOpen(false);
 }
 }

 function onScroll() {
 setOpen(false);
 }

 document.addEventListener("mousedown", close);
 window.addEventListener("scroll", onScroll, true);
 return () => {
 document.removeEventListener("mousedown", close);
 window.removeEventListener("scroll", onScroll, true);
 };
 }, [open]);

 function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
 if (e.key ==="Enter") {
 e.preventDefault();
 onEnter?.();
 } else if (e.key ==="") {
 e.preventDefault();
 openDropdown();
 } else if (e.key ==="Escape") {
 setOpen(false);
 } else if (e.key ==="Tab" && onTabKey) {
 onTabKey();
 }
 }

 return (
 <td
 style={{ width: w, minWidth: w, maxWidth: w }}
 onClick={openDropdown}
 className={cn(
"relative border-b border-r border-gray-100 p-0 align-top cursor-pointer",
 toneClass ||"bg-transparent",
 cellClassName,
 )}
 >
 <button
 ref={(el) => {
 btnRef.current = el;
 if (setRef) setRef(el);
 if (autoFocusOpen && el) setTimeout(() => el.focus(), 0);
 }}
 type="button"
 onClick={openDropdown}
 onKeyDown={handleKeyDown}
 className="absolute inset-0 flex h-full w-full items-center justify-between gap-1 bg-transparent px-[6px] py-[4px] text-xs font-bold uppercase tracking-wide text-gray-800 outline-none focus:ring-2 focus:ring-inset focus:ring-sky-400"
 >
 <span className={cn("truncate", !value &&"text-gray-400")}>
 {value || placeholder ||"Select"}
 </span>
 <CaretDown size={10} weight="bold" className="shrink-0 opacity-70" />
 </button>
 {open && rect && typeof document !=='undefined' && createPortal(
 <ul
 ref={listRef}
 style={{ position:"fixed", top: rect.top, left: rect.left, minWidth: rect.width, zIndex: 99999 }}
 className="overflow-hidden  border border-gray-200 bg-white shadow-md"
 >
 {options.map((opt) => {
 const optTone = getToneClass(fieldKey, opt);
 return (
 <li key={opt}>
 <button
 type="button"
 className="flex w-full items-center gap-2 px-3 py-[5px] text-left text-xs font-bold uppercase tracking-wide text-gray-700 hover:bg-gray-50"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.stopPropagation();
 onChange(opt);
 setOpen(false);
 }}
 >
 <span className={cn("inline-block h-2 w-2 shrink-0 ", optTone ||"bg-gray-300")} />
 <span className={optTone ?"" :"text-gray-600"}>{opt}</span>
 </button>
 </li>
 );
 })}
 </ul>,
 document.body
 )}
 </td>
 );
}
