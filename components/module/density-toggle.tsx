"use client";

import { useEffect, useState } from "react";
import { Rows, SquaresFour } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type Density = "compact" | "comfortable";

const STORAGE_KEY = "qa-dashboard-density";
const DEFAULT_DENSITY: Density = "comfortable";

const DENSITY_VARS: Record<Density, Record<string, string>> = {
  compact: {
    "--qa-density-padding": "8px",
    "--qa-density-font-size": "12px",
    "--qa-density-gap": "8px",
  },
  comfortable: {
    "--qa-density-padding": "16px",
    "--qa-density-font-size": "14px",
    "--qa-density-gap": "16px",
  },
};

function readStoredDensity(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "compact" || value === "comfortable") return value;
  } catch {
    // localStorage unreadable - fall through
  }
  return DEFAULT_DENSITY;
}

function applyDensityToContainer(container: HTMLElement | null, density: Density) {
  if (!container) return;
  const vars = DENSITY_VARS[density];
  for (const [key, value] of Object.entries(vars)) {
    container.style.setProperty(key, value);
  }
  container.dataset.density = density;
}

type DensityToggleProps = {
  /** CSS selector for the dashboard container that should receive density CSS variables. */
  containerSelector?: string;
  className?: string;
};

/**
 * DensityToggle - switches the dashboard between Compact and Comfortable layouts.
 * Persists the selection in localStorage and applies CSS custom properties to
 * the container so styles can react via `var(--qa-density-padding)` etc.
 */
export function DensityToggle({ containerSelector = "[data-dashboard-root]", className }: DensityToggleProps) {
  // Lazy-init from localStorage so we never trigger a setState-in-effect.
  const [density, setDensity] = useState<Density>(() => readStoredDensity());

  // Apply on every change (and initial mount). Side effect only - no setState here.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const container = document.querySelector(containerSelector) as HTMLElement | null;
    applyDensityToContainer(container, density);
    try {
      window.localStorage.setItem(STORAGE_KEY, density);
    } catch {
      // ignore quota / private-mode write failures
    }
  }, [density, containerSelector]);

  return (
    <div
      role="group"
      aria-label="Dashboard density"
      className={cn(
        "inline-flex items-center  border border-gray-200 bg-gray-50 p-0.5 text-[11px] font-bold transition-all duration-150",
        className,
      )}
      data-testid="density-toggle"
    >
      <DensityButton
        active={density === "comfortable"}
        onClick={() => setDensity("comfortable")}
        icon={<SquaresFour size={12} weight="bold" />}
        label="Comfortable"
      />
      <DensityButton
        active={density === "compact"}
        onClick={() => setDensity("compact")}
        icon={<Rows size={12} weight="bold" />}
        label="Compact"
      />
    </div>
  );
}

function DensityButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={`density-${label.toLowerCase()}`}
      className={cn(
        "inline-flex h-7 items-center gap-1  px-2.5 transition",
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
