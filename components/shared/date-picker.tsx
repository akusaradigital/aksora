"use client";

import { useState, useRef, useEffect, useCallback } from"react";
import { createPortal } from"react-dom";
import { CaretLeft, CaretRight, CalendarBlank } from"@phosphor-icons/react";
import { cn } from"@/lib/utils";

// If date-fns is not installed, we can fall back to vanilla JS. Let's make it pure vanilla just to be safe as npm install failed.

function getAllScrollParents(el: HTMLElement | null): HTMLElement[] {
 const parents: HTMLElement[] = [];
 let current = el?.parentElement;
 while (current) {
 const style = getComputedStyle(current);
 if (/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) {
 parents.push(current);
 }
 current = current.parentElement;
 }
 return parents;
}

export function ModernDatePicker({
 name,
 value,
 onChange,
 required: _required,
 disabled}: {
 name: string;
 value?: string;
 onChange?: (date: string) => void;
 required?: boolean;
 disabled?: boolean;
}) {
 const [isOpen, setIsOpen] = useState(false);
 const [mounted, setMounted] = useState(false);
 // Start with a dummy date, but it won't be rendered due to the !mounted check below
 const [currentDate, setCurrentDate] = useState(new Date()); 
 const [selectedDate, setSelectedDate] = useState<Date | null>(null);
 const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
 
 const popoverRef = useRef<HTMLDivElement>(null);
 const triggerRef = useRef<HTMLDivElement>(null);
 const dropdownRef = useRef<HTMLDivElement>(null);

 const updatePosition = useCallback(() => {
 if (!triggerRef.current) return;
 const rect = triggerRef.current.getBoundingClientRect();
 const spaceBelow = window.innerHeight - rect.bottom;
 const dropdownHeight = 320; // approximate calendar height
 // If not enough space below, open above
 if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
 setDropdownPos({ top: rect.top - dropdownHeight - 4, left: rect.left });
 } else {
 setDropdownPos({ top: rect.bottom + 4, left: rect.left });
 }
 }, []);

 useEffect(() => {
 setMounted(true);
 if (disabled) setIsOpen(false);
 
 // Sync with value or set to now only on client side
 if (value) {
 const d = new Date(value);
 setCurrentDate(d);
 setSelectedDate(d);
 } else {
 setCurrentDate(new Date());
 }

 function handleClickOutside(event: MouseEvent) {
 if (
 popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
 dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
 ) {
 setIsOpen(false);
 }
 }
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, [disabled, value]);

 // Recalculate position when open or on scroll/resize
 useEffect(() => {
 if (!isOpen) return;
 updatePosition();
 const scrollables = getAllScrollParents(triggerRef.current);
 const handler = () => updatePosition();
 window.addEventListener("resize", handler);
 scrollables.forEach(el => el.addEventListener("scroll", handler));
 return () => {
 window.removeEventListener("resize", handler);
 scrollables.forEach(el => el.removeEventListener("scroll", handler));
 };
 }, [isOpen, updatePosition]);

 const getDaysInMonth = (date: Date) => {
 const year = date.getFullYear();
 const month = date.getMonth();
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const firstDayOfMonth = new Date(year, month, 1).getDay();
 
 const days = [];
 // Add empty slots for days before the 1st
 for (let i = 0; i < firstDayOfMonth; i++) {
 days.push(null);
 }
 for (let i = 1; i <= daysInMonth; i++) {
 days.push(new Date(year, month, i));
 }
 return days;
 };

 const days = getDaysInMonth(currentDate);
 const weekDays = ["Su","Mo","Tu","We","Th","Fr","Sa"];

 const handleSelect = (date: Date) => {
 setSelectedDate(date);
 setIsOpen(false);
 
 // Format YYYY-MM-DD
 const yyyy = date.getFullYear();
 const mm = String(date.getMonth() + 1).padStart(2,'0');
 const dd = String(date.getDate()).padStart(2,'0');
 if (onChange) onChange(`${yyyy}-${mm}-${dd}`);
 };

 if (!mounted) {
 return (
 <div className="h-12 w-full animate-pulse  border border-gray-200 bg-gray-100" />
 );
 }

 return (
 <div className="relative w-full" ref={popoverRef}>
 {/* Hidden native input so forms continue to work without changing module-workspace logic significantly */}
 <input type="hidden" name={name} value={selectedDate ? selectedDate.toISOString().split('T')[0] :""} />
 
 <div ref={triggerRef} className="group relative flex h-12 w-full items-center  border border-gray-200 bg-gray-50 transition focus-within:border-blue-300 focus-within:bg-white hover:bg-white">
 <button
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 disabled={disabled}
 className={cn(
"flex h-full flex-grow items-center px-4 text-sm outline-none",
 disabled &&"cursor-not-allowed",
 !selectedDate ?"text-gray-400" :"text-gray-800"
 )}
 >
 <span>
 {selectedDate 
 ? selectedDate.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
 :"Select a date..."}
 </span>
 </button>

 <div className="flex h-full items-center gap-1 pr-2">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 if (disabled) return;
 handleSelect(new Date());
 }}
 disabled={disabled}
 className="flex h-8 items-center rounded bg-blue-100 px-2 text-[11px] font-bold uppercase tracking-wider text-blue-700 transition hover:bg-blue-200"
 >
 Today
 </button>
 <button 
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 disabled={disabled}
 className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-blue-600"
 >
 <CalendarBlank size={18} />
 </button>
 </div>
 </div>

 {isOpen && !disabled && dropdownPos && createPortal(
 <div
 ref={dropdownRef}
 style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
 className="w-72  border border-gray-200 bg-white p-4 shadow-md animate-in fade-in  duration-150"
 >
 <div className="flex items-center justify-between mb-4">
 <button
 type="button"
 onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
 className="flex h-8 w-8 items-center justify-center  hover:bg-gray-100 text-gray-600 transition"
 >
 <CaretLeft size={16} weight="bold" />
 </button>
 <div className="text-sm font-semibold text-gray-800">
 {currentDate.toLocaleDateString('en-US', { month:'long', year:'numeric' })}
 </div>
 <button
 type="button"
 onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
 className="flex h-8 w-8 items-center justify-center  hover:bg-gray-100 text-gray-600 transition"
 >
 <CaretRight size={16} weight="bold" />
 </button>
 </div>

 <div className="grid grid-cols-7 gap-1 text-center mb-2">
 {weekDays.map(day => (
 <div key={day} className="text-xs font-bold uppercase text-gray-400">{day}</div>
 ))}
 </div>

 <div className="grid grid-cols-7 gap-1">
 {days.map((day, idx) => {
 if (!day) return <div key={`empty-${idx}`} className="h-8" />;
 
 const isSelected = selectedDate && 
 day.getDate() === selectedDate.getDate() && 
 day.getMonth() === selectedDate.getMonth() && 
 day.getFullYear() === selectedDate.getFullYear();
 
 const isToday = new Date().toDateString() === day.toDateString();

 return (
 <button
 key={idx}
 type="button"
 onClick={() => handleSelect(day)}
 className={cn(
"flex h-8 w-8 items-center justify-center  text-sm transition-all hover:bg-blue-100",
 isSelected ?"bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700" :"text-gray-700",
 isToday && !isSelected &&"text-blue-600 font-bold bg-blue-50"
 )}
 >
 {day.getDate()}
 </button>
 );
 })}
 </div>
 </div>,
 document.body
 )}
 </div>
 );
}
