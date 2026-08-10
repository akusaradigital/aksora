"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { cn, formatDate } from "@/lib/utils";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Printer,
  TrendUp,
  ArrowDown,
  ArrowUp,
  Minus,
} from "@phosphor-icons/react";
import { getMonday, getSunday, toDateStr } from "./report-utils";

function TrendIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <ArrowUp size={13} weight="bold" />;
  if (direction === "down") return <ArrowDown size={13} weight="bold" />;
  return <Minus size={13} weight="bold" />;
}

export function ReportPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex h-9 items-center gap-2  border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 print:hidden"
    >
      <Printer size={15} weight="bold" />
      Print / PDF
    </button>
  );
}

export function ReportDateNav({
  weekStart,
  setWeekStart,
  weekEnd,
  customEnd,
  setCustomEnd,
  isCurrentWeek,
  passRateTone,
  reportMood,
}: {
  weekStart: Date;
  setWeekStart: (d: Date | ((prev: Date) => Date)) => void;
  weekEnd: Date;
  customEnd: Date;
  setCustomEnd: (d: Date) => void;
  isCurrentWeek: boolean;
  passRateTone: string;
  reportMood: { label: string; tone: "up" | "down" | "flat" } | null;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [rangeFrom, setRangeFrom] = useState<Date | null>(null);
  const [rangeTo, setRangeTo] = useState<Date | null>(null);
  const [_rangeError, setRangeError] = useState<string | null>(null);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
        setRangeFrom(null);
        setRangeTo(null);
        setRangeError(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goWeek = (dir: -1 | 1) => {
    setWeekStart((prev: Date) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      const newStart = d;
      const newEnd = getSunday(newStart);
      setCustomEnd(newEnd);
      return newStart;
    });
  };

  const pickDate = (d: Date) => {
    setRangeError(null);
    if (!rangeFrom || (rangeFrom && rangeTo)) {
      setRangeFrom(d);
      setRangeTo(null);
    } else {
      const start = d < rangeFrom ? d : rangeFrom;
      const end = d < rangeFrom ? rangeFrom : d;
      setRangeFrom(start);
      setRangeTo(end);
    }
  };

  const applyRange = () => {
    if (!rangeFrom || !rangeTo) return;
    setWeekStart(() => rangeFrom);
    setCustomEnd(rangeTo);
    setRangeFrom(null);
    setRangeTo(null);
    setCalOpen(false);
  };

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [calMonth]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 print:justify-between">
      <div className="relative flex items-center gap-1 print:hidden" ref={calRef}>
        <button
          onClick={() => goWeek(-1)}
          className="flex h-8 w-8 items-center justify-center  border border-gray-200 bg-white text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <button
          onClick={() => { setCalMonth(new Date(weekStart)); setCalOpen(!calOpen); }}
          className="flex h-8 items-center gap-2  border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:bg-blue-50 hover:text-blue-600"
        >
          <CalendarBlank size={14} weight="bold" />
          {formatDate(toDateStr(weekStart))} - {formatDate(toDateStr(weekEnd))}
        </button>
        <button
          onClick={() => goWeek(1)}
          className="flex h-8 w-8 items-center justify-center  border border-gray-200 bg-white text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
        >
          <CaretRight size={14} weight="bold" />
        </button>
        {!isCurrentWeek && (
          <button
            onClick={() => { const m = getMonday(new Date()); setWeekStart(() => m); setCustomEnd(getSunday(m)); }}
            className="ml-1 flex h-8 items-center  bg-blue-100 px-2.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 transition hover:bg-blue-200"
          >
            This period
          </button>
        )}

        {calOpen && (
          <div className="absolute left-0 top-10 z-50 w-72  border border-gray-200 bg-white p-4 shadow-md animate-in fade-in duration-200">
            <div className="mb-2 text-center text-[11px] font-bold text-gray-400">
              {!rangeFrom ? "Select start date" : !rangeTo ? "Select end date" : `${formatDate(toDateStr(rangeFrom))} - ${formatDate(toDateStr(rangeTo))}`}
            </div>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                className="flex h-7 w-7 items-center justify-center  text-gray-500 transition hover:bg-gray-100"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <span className="text-xs font-bold text-gray-700">
                {calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                className="flex h-7 w-7 items-center justify-center  text-gray-500 transition hover:bg-gray-100"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                <div key={d} className="text-[11px] font-bold uppercase text-gray-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="h-7" />;
                const ds = toDateStr(day);
                const isRangeStart = rangeFrom && ds === toDateStr(rangeFrom);
                const isRangeEnd = rangeTo && ds === toDateStr(rangeTo);
                const inPickedRange = rangeFrom && rangeTo && ds >= toDateStr(rangeFrom) && ds <= toDateStr(rangeTo);
                const inCurrentRange = !rangeFrom && ds >= toDateStr(weekStart) && ds <= toDateStr(weekEnd);
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => pickDate(day)}
                    className={cn(
                      "flex h-7 w-full items-center justify-center text-xs font-semibold transition hover:bg-blue-100",
                      (isRangeStart || isRangeEnd) ? " bg-blue-700 text-white ring-2 ring-blue-300" :
                      inPickedRange ? "bg-blue-500 text-white" :
                      inCurrentRange ? " bg-blue-600 text-white hover:bg-blue-700" :
                      " text-gray-700",
                      isRangeStart && "rounded-l-md rounded-r-none",
                      isRangeEnd && "rounded-r-md rounded-l-none",
                      inPickedRange && !isRangeStart && !isRangeEnd && "rounded-none",
                      isToday && !inCurrentRange && !inPickedRange && !isRangeStart && "font-bold text-blue-600 bg-blue-50"
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            {rangeFrom && rangeTo && (
              <button
                type="button"
                onClick={applyRange}
                className="mt-3 flex h-9 w-full items-center justify-center  bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-500"
              >
                Apply Filter
              </button>
            )}
          </div>
        )}
      </div>

      <div className="hidden print:flex items-center gap-2">
        <CalendarBlank size={13} weight="bold" />
        Period: <span className="font-bold text-gray-700">{formatDate(toDateStr(weekStart))}</span> - <span className="font-bold text-gray-700">{formatDate(toDateStr(weekEnd))}</span>
      </div>

      <span className={cn("ml-2 inline-flex items-center gap-1  px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-white", passRateTone)}>
        <TrendIcon direction={reportMood?.tone ?? "flat"} />
        {reportMood?.label}
      </span>
    </div>
  );
}
