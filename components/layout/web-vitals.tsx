"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // In development, log to console
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Web Vital] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`
      );
      return;
    }

    // In production, send to analytics endpoint (non-blocking)
    const body = JSON.stringify({
      name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
    });

    // Use sendBeacon for reliability (doesn't block page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals", body);
    }
  });

  return null;
}
