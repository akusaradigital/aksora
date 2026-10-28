"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getToneClass } from "./test-case-detail-helpers";

interface CustomSelectProps {
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
}: CustomSelectProps) {
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
      if (
        listRef.current &&
        !listRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
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
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    } else if (e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openDropdown();
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab" && onTabKey) {
      onTabKey();
    }
  }

  return (
    <td
      style={{ width: w, minWidth: w, maxWidth: w }}
      onClick={openDropdown}
      className={cn(
        "relative border-b border-r border-gray-100 p-0 align-top cursor-pointer",
        toneClass || "bg-transparent",
        cellClassName
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
        <span className={cn("truncate", !value && "text-gray-400")}>
          {value || placeholder || "Select"}
        </span>
        <CaretDown size={10} weight="bold" className="shrink-0 opacity-70" />
      </button>
      {open &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              minWidth: rect.width,
              zIndex: 99999,
            }}
            className="overflow-hidden border border-gray-200 bg-white shadow-md"
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
                    <span
                      className={cn(
                        "inline-block h-2 w-2 shrink-0 rounded-full",
                        optTone || "bg-gray-300"
                      )}
                    />
                    <span className={optTone ? "" : "text-gray-600"}>{opt}</span>
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
