"use client";

import { useEffect, useState } from "react";

type EnvOption = { id: number; name: string; project: string; enabled: boolean };

/** Dropdown of enabled test environments; value "" means no environment. */
export function EnvironmentSelect({
  value,
  onChange,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}) {
  const [options, setOptions] = useState<EnvOption[]>([]);

  useEffect(() => {
    fetch("/api/test-environments")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setOptions((d.data || []).filter((e: EnvOption) => e.enabled)))
      .catch(() => setOptions([]));
  }, []);

  return (
    <select
      id={id}
      aria-label="Environment"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? "h-10 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"}
    >
      <option value="">No environment</option>
      {options.map((e) => (
        <option key={e.id} value={String(e.id)}>
          {e.project ? `${e.project} / ${e.name}` : e.name}
        </option>
      ))}
    </select>
  );
}
