"use client";

import { useState, useEffect } from "react";
import { CaretUp } from "@phosphor-icons/react";

export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-5 z-50 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white/95 px-3.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-sm transition-all hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-950"
      aria-label="Back to top"
    >
      <CaretUp size={14} weight="bold" />
      <span>Back to top</span>
    </button>
  );
}
