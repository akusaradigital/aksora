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
      className="fixed bottom-5 right-5 z-50 flex h-9 w-9 items-center justify-center border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:bg-gray-900 hover:text-white hover:border-gray-900"
      aria-label="Scroll to top"
    >
      <CaretUp size={16} weight="bold" />
    </button>
  );
}
