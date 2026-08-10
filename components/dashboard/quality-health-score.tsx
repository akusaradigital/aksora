"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

type QualityHealthScoreProps = {
  qualityHealthScore?: {
    score: number;
    components: {
      resolutionRate: number | null;
      inverseCriticalRatio: number | null;
      testPassRate: number | null;
    };
  };
};

/**
 * Returns the Tailwind color class based on the score value.
 * Red (<50), Amber (50–74), Emerald (≥75)
 */
export function getScoreColor(score: number): string {
  if (score < 50) return "text-red-500";
  if (score <= 74) return "text-amber-500";
  return "text-emerald-500";
}

/**
 * Returns the SVG stroke color class based on the score value.
 */
function getStrokeColor(score: number): string {
  if (score < 50) return "stroke-red-500";
  if (score <= 74) return "stroke-amber-500";
  return "stroke-emerald-500";
}

/**
 * Builds the tooltip text based on which component metrics are null.
 */
export function getTooltipText(components: {
  resolutionRate: number | null;
  inverseCriticalRatio: number | null;
  testPassRate: number | null;
}): string | null {
  const allNull =
    components.resolutionRate === null &&
    components.inverseCriticalRatio === null &&
    components.testPassRate === null;

  if (allNull) {
    return "No data available for score computation";
  }

  const missing: string[] = [];
  if (components.resolutionRate === null) missing.push("resolution rate");
  if (components.inverseCriticalRatio === null) missing.push("inverse critical ratio");
  if (components.testPassRate === null) missing.push("test pass rate");

  if (missing.length > 0) {
    return `Missing: ${missing.join(", ")}`;
  }

  return null;
}

/**
 * QualityHealthScore component with circular progress indicator.
 * Displays a composite quality score (0–100) with color-coded bands
 * and tooltip for incomplete metrics.
 */
export function QualityHealthScore({ qualityHealthScore }: QualityHealthScoreProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Don't render if data is undefined
  if (!qualityHealthScore) return null;

  const { score, components } = qualityHealthScore;

  // When all inputs are unavailable, display score as 0
  const allNull =
    components.resolutionRate === null &&
    components.inverseCriticalRatio === null &&
    components.testPassRate === null;

  const displayScore = allNull ? 0 : score;
  const tooltipText = getTooltipText(components);

  // SVG circular progress parameters
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = displayScore / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="relative inline-flex flex-col items-center"
      data-testid="quality-health-score"
      onMouseEnter={() => tooltipText && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Circular progress indicator */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-label={`Quality Health Score: ${displayScore}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-gray-100"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn("transition-all duration-700 ease-out", getStrokeColor(displayScore))}
          />
        </svg>
        {/* Score text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn("text-lg font-bold", getScoreColor(displayScore))}
            data-testid="quality-health-score-value"
          >
            {displayScore}
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="mt-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        Health Score
      </p>

      {/* Tooltip */}
      {showTooltip && tooltipText && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap  bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md"
          data-testid="quality-health-score-tooltip"
        >
          {tooltipText}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
