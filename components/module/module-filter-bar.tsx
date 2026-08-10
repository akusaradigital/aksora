"use client";

import { useState, useRef, useEffect } from "react";
import { Funnel, X, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type FilterValue = {
  key: string;
  value: string;
  label: string;
};

type FilterOption = {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

type ModuleFilterBarProps = {
  filters: FilterOption[];
  activeFilters: FilterValue[];
  onFilterChange: (filters: FilterValue[]) => void;
};

function FilterDropdown({
  filter,
  activeValue,
  onSelect,
}: {
  filter: FilterOption;
  activeValue: string | undefined;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedOption = filter.options.find((o) => o.value === activeValue);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5  border px-3 text-xs font-semibold transition",
          activeValue
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
        )}
      >
        {selectedOption ? selectedOption.label : filter.label}
        <CaretDown size={11} weight="bold" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-48 overflow-y-auto  border border-gray-200 bg-white shadow-md animate-in fade-in  duration-150">
          <button
            type="button"
            onClick={() => { onSelect(""); setOpen(false); }}
            className={cn(
              "block w-full px-3 py-2 text-left text-xs font-medium transition",
              !activeValue ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50",
            )}
          >
            All {filter.label}
          </button>
          {filter.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onSelect(option.value); setOpen(false); }}
              className={cn(
                "block w-full truncate px-3 py-2 text-left text-xs font-medium transition",
                activeValue === option.value ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModuleFilterBar({ filters, activeFilters, onFilterChange }: ModuleFilterBarProps) {
  if (filters.length === 0) return null;

  const handleSelect = (key: string, value: string) => {
    if (!value) {
      onFilterChange(activeFilters.filter((f) => f.key !== key));
    } else {
      const filter = filters.find((f) => f.key === key);
      const option = filter?.options.find((o) => o.value === value);
      const label = option?.label ?? value;
      const existing = activeFilters.filter((f) => f.key !== key);
      onFilterChange([...existing, { key, value, label }]);
    }
  };

  const clearAll = () => onFilterChange([]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
        <Funnel size={13} weight="bold" />
        Filters
      </span>
      {filters.map((filter) => (
        <FilterDropdown
          key={filter.key}
          filter={filter}
          activeValue={activeFilters.find((f) => f.key === filter.key)?.value}
          onSelect={(value) => handleSelect(filter.key, value)}
        />
      ))}
      {activeFilters.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-8 items-center gap-1  bg-gray-100 px-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200"
        >
          <X size={11} weight="bold" />
          Clear
        </button>
      )}
    </div>
  );
}
