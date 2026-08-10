"use client";

import Link from"next/link";
import { useEffect, useRef } from"react";
import { ArrowRight, CaretRight, X } from"@phosphor-icons/react";
import { Badge } from"@/components/shared/badge";
import { CommentThread } from"@/components/shared/comment-thread";

export type DashboardDrawerItem = {
 label: string;
 sub?: string;
 badge?: string;
 badge2?: string;
 href: string;
};

type DashboardDrawerProps = {
 title: string;
 subtitle?: string;
 items: DashboardDrawerItem[];
 loading?: boolean;
 onClose: () => void;
 viewAllHref?: string;
 /** Entity type for comment thread (e.g., "Bug", "Task") */
 entityType?: string;
 /** Entity ID for comment thread */
 entityId?: number;
};

export function DashboardDrawer({ title, subtitle, items, loading, onClose, viewAllHref, entityType, entityId }: DashboardDrawerProps) {
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) onClose();
 };
 const keyHandler = (e: KeyboardEvent) => {
 if (e.key ==="Escape") onClose();
 };

 document.addEventListener("mousedown", handler);
 document.addEventListener("keydown", keyHandler);
 return () => {
 document.removeEventListener("mousedown", handler);
 document.removeEventListener("keydown", keyHandler);
 };
 }, [onClose]);

 return (
 <div className="fixed inset-0 z-50 flex justify-end bg-black/30  animate-in fade-in duration-150">
 <div ref={ref} className="flex h-full w-full max-w-sm flex-col bg-white shadow-md animate-in slide-in-from-right duration-150">
 <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
 <div>
 <h2 className="text-base font-bold text-gray-900">{title}</h2>
 {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
 </div>
 <button
 onClick={onClose}
 className="flex h-8 w-8 items-center justify-center  text-gray-400 transition hover:bg-gray-100"
 >
 <X size={16} weight="bold" />
 </button>
 </div>

 <div className="flex-1 space-y-2 overflow-y-auto p-4">
 {loading ? (
 Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="h-14 animate-pulse  bg-gray-100" />
 ))
 ) : items.length === 0 ? (
 <div className="py-10 text-center text-xs text-gray-400">No items found.</div>
 ) : (
 items.map((item, i) => (
 <Link
 key={i}
 href={item.href}
 prefetch={false}
 onClick={onClose}
 className="group flex items-center gap-3  border border-gray-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
 >
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold text-gray-800 transition group-hover:text-blue-700">
 {item.label}
 </p>
 {item.sub && <p className="mt-0.5 truncate text-xs text-gray-400">{item.sub}</p>}
 </div>
 <div className="flex shrink-0 items-center gap-1.5">
 {item.badge && <Badge value={item.badge} />}
 {item.badge2 && <Badge value={item.badge2} />}
 </div>
 <CaretRight size={12} className="shrink-0 text-gray-300 transition group-hover:text-blue-500" />
 </Link>
 ))
 )}
 </div>

 {/* Comment Thread - shown when entity info is provided */}
 {entityType && entityId && !loading && (
 <CommentThread entityType={entityType} entityId={entityId} />
 )}

 {viewAllHref && (
 <div className="border-t border-gray-100 p-4">
 <Link
 href={viewAllHref}
 prefetch={false}
 onClick={onClose}
 className="flex h-10 items-center justify-center gap-2  bg-gray-900 text-sm font-bold text-white transition hover:bg-blue-600"
 >
 View All <ArrowRight size={14} weight="bold" />
 </Link>
 </div>
 )}
 </div>
 </div>
 );
}
