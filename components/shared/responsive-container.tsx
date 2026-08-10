"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  width?: number | string;
  height?: number | string;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  children: ReactNode;
};

export function ResponsiveContainer({
  width = "100%",
  height = "100%",
  minWidth = 1,
  minHeight = 1,
  className,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const { width: measuredWidth, height: measuredHeight } = element.getBoundingClientRect();
      setReady(measuredWidth >= minWidth && measuredHeight >= minHeight);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [minHeight, minWidth]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width,
        height,
        minWidth,
        minHeight,
      }}
    >
      {ready ? children : null}
    </div>
  );
}
