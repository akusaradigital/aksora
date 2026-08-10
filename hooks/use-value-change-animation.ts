"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook that detects when a value changes and returns a CSS class name
 * to trigger the stat-value-pop animation. The class is applied for
 * the animation duration (300ms) then removed.
 *
 * Uses transform and opacity only - no layout shifts.
 * Respects prefers-reduced-motion via the CSS @media rule in globals.css.
 */
export function useValueChangeAnimation(value: number | string | null | undefined): string {
  const prevValue = useRef(value);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevValue.current = value;
      return;
    }
    if (prevValue.current !== value) {
      setAnimating(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAnimating(false), 300);
    }
    prevValue.current = value;
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  return animating ? "animate-stat-pop" : "";
}
