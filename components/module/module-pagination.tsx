"use client";

import { useState } from "react";

type ModulePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
  onGoToPage?: (page: number) => void;
};

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export function ModulePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrev,
  onNext,
  onGoToPage,
}: ModulePaginationProps) {
  const [jumpValue, setJumpValue] = useState("");

  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  const handleJump = () => {
    const target = parseInt(jumpValue, 10);
    if (target >= 1 && target <= totalPages && target !== page && onGoToPage) {
      onGoToPage(target);
    }
    setJumpValue("");
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-3 border-t border-gray-200/60 pt-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrev}
          className="h-8  border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ←
        </button>

        {pageNumbers.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (p !== page && onGoToPage) onGoToPage(p);
                else if (p < page) onPrev();
                else if (p > page) onNext();
              }}
              className={`h-8 min-w-[32px]  border px-2 text-xs font-semibold transition ${
                p === page
                  ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-700"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="h-8  border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          →
        </button>

        {totalPages > 7 && onGoToPage && (
          <div className="ml-2 flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleJump(); }}
              placeholder="Go to"
              className="h-8 w-16  border border-gray-200 bg-white px-2 text-center text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
            <button
              type="button"
              onClick={handleJump}
              className="h-8  border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 transition hover:border-blue-400 hover:text-blue-700"
            >
              Go
            </button>
          </div>
        )}
      </div>

      <p className="text-xs font-medium text-gray-500">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems} items
      </p>
    </div>
  );
}
