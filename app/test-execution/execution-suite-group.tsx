"use client";

import { useRef, useState, useEffect } from"react";
import Link from"next/link";
import { Badge } from"@/components/shared/badge";
import {
 Play,
 CheckCircle,
 XCircle,
 Warning,
 CaretLeft,
 CaretRight,
 Table,
} from"@phosphor-icons/react";

type ExecutionItem = {
 id: string | number;
 title: string;
 notes?: string;
 status: string;
 publicToken: string;
 passed?: number;
 failed?: number;
 blocked?: number;
};

export function ExecutionGroupList({ items }: { items: ExecutionItem[] }) {
 const scrollRef = useRef<HTMLDivElement>(null);
 const [canScrollLeft, setCanScrollLeft] = useState(false);
 const [canScrollRight, setCanScrollRight] = useState(false);

 const checkScroll = () => {
 const el = scrollRef.current;
 if (!el) return;
 setCanScrollLeft(el.scrollLeft > 4);
 setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
 };

 useEffect(() => {
 checkScroll();
 const el = scrollRef.current;
 if (!el) return;
 el.addEventListener("scroll", checkScroll);
 window.addEventListener("resize", checkScroll);
 return () => {
 el.removeEventListener("scroll", checkScroll);
 window.removeEventListener("resize", checkScroll);
 };
 }, [items]);

 const scroll = (dir:"left" |"right") => {
 const el = scrollRef.current;
 if (!el) return;
 const cardWidth = 300 + 16;
 el.scrollBy({ left: dir ==="left" ? -cardWidth : cardWidth, behavior:"smooth" });
 };

 const showArrows = items.length > 3;

 return (
 <div className="relative">
 {showArrows && canScrollLeft && (
 <button
 type="button"
 onClick={() => scroll("left")}
 className="absolute left-2 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center  glass-card text-gray-700 shadow-md transition-all  hover:bg-gray-100"
 aria-label="Scroll left"
 >
 <CaretLeft size={17} weight="bold" className="text-gray-700" />
 </button>
 )}
 {showArrows && canScrollRight && (
 <button
 type="button"
 onClick={() => scroll("right")}
 className="absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center  glass-card text-gray-700 shadow-md transition-all  hover:bg-gray-100"
 aria-label="Scroll right"
 >
 <CaretRight size={17} weight="bold" className="text-gray-700" />
 </button>
 )}

 <div
 ref={scrollRef}
 className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
 style={{ scrollbarWidth:"none" }}
 >
 {items.map((item) => (
 <div
 key={item.id}
 className="group relative flex flex-col overflow-hidden  glass-card bg-white p-5 transition-all duration-150 hover:border-blue-400 hover:shadow-md flex-shrink-0 w-[300px]"
 >
 <div className="mb-4 flex items-start justify-between">
 <div className="h-10 w-10  bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 transition-colors">
 <Table size={20} weight="bold" />
 </div>
 <Badge value={item.status} />
 </div>

 <h4 className="mb-1 text-base font-bold text-gray-900 transition-colors">
 {item.title}
 </h4>
 <p className="mb-6 text-sm text-gray-500 line-clamp-2 min-h-[40px]">
 {item.notes ||"No additional notes provided for this execution item."}
 </p>

 <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-4">
 <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
 <div className="flex items-center gap-1" title="Passed">
 <CheckCircle size={14} className="text-emerald-500" />
 {item.passed ?? 0}
 </div>
 <div className="flex items-center gap-1" title="Failed">
 <XCircle size={14} className="text-rose-500" />
 {item.failed ?? 0}
 </div>
 <div className="flex items-center gap-1" title="Blocked">
 <Warning size={14} className="text-amber-500" />
 {item.blocked ?? 0}
 </div>
 </div>

 <Link
 href={`/test-execution/${item.publicToken}`}
 className="inline-flex h-9 items-center gap-2  bg-gray-900 px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-blue-600 hover:pr-5"
 >
 Execute
 <Play size={14} weight="fill" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
