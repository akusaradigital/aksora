"use client";

import { useEffect, useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { cn, decomposeDuration, composeDuration, formatDuration } from "@/lib/utils";

export const DURATION_PRESETS = [
  { label: "30m", minutes: 30 },
  { label: "1h (60m)", minutes: 60 },
  { label: "2h (120m)", minutes: 120 },
  { label: "4h (240m)", minutes: 240 },
  { label: "8h (480m)", minutes: 480 },
];

export interface DurationInputProps {
  name?: string;
  value?: number | string;
  onChange?: (totalMinutes: number) => void;
  disabled?: boolean;
  error?: boolean;
  showPresets?: boolean;
  className?: string;
}

export function DurationInput({
  name,
  value,
  onChange,
  disabled,
  error,
  showPresets = true,
  className,
}: DurationInputProps) {
  const initial = decomposeDuration(value);
  const [hoursDraft, setHoursDraft] = useState<string>(
    initial.hours > 0 ? String(initial.hours) : initial.totalMinutes > 0 ? "0" : ""
  );
  const [minutesDraft, setMinutesDraft] = useState<string>(
    initial.minutes > 0 ? String(initial.minutes) : initial.totalMinutes > 0 ? "0" : ""
  );

  // Sync state if external value changes (e.g. row loaded or AI format returned)
  useEffect(() => {
    const dec = decomposeDuration(value);
    setHoursDraft(dec.hours > 0 ? String(dec.hours) : dec.totalMinutes > 0 ? "0" : "");
    setMinutesDraft(dec.minutes > 0 ? String(dec.minutes) : dec.totalMinutes > 0 ? "0" : "");
  }, [value]);

  const currentTotal = composeDuration(hoursDraft, minutesDraft);

  const handleHoursChange = (val: string) => {
    setHoursDraft(val);
    const newTotal = composeDuration(val, minutesDraft);
    onChange?.(newTotal);
  };

  const handleMinutesChange = (val: string) => {
    setMinutesDraft(val);
    const newTotal = composeDuration(hoursDraft, val);
    onChange?.(newTotal);
  };

  const handlePresetSelect = (presetMinutes: number) => {
    if (presetMinutes === currentTotal) {
      setHoursDraft("");
      setMinutesDraft("");
      onChange?.(0);
      return;
    }
    const dec = decomposeDuration(presetMinutes);
    setHoursDraft(dec.hours > 0 ? String(dec.hours) : "0");
    setMinutesDraft(String(dec.minutes));
    onChange?.(presetMinutes);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentTotal > 0 ? String(currentTotal) : ""}
        />
      )}

      {/* Dual Inputs: Jam and Menit */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Jam <span className="font-normal lowercase text-gray-400">(hours)</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              step="1"
              disabled={disabled}
              placeholder="0"
              value={hoursDraft}
              onChange={(e) => handleHoursChange(e.target.value)}
              className={cn(
                "w-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 pr-10 focus:border-sky-600 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed",
                error && "border-rose-500 focus:border-rose-600"
              )}
            />
            <span className="pointer-events-none absolute right-3 text-[11px] font-semibold text-gray-400">
              jam
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Menit <span className="font-normal lowercase text-gray-400">(minutes)</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              max="59"
              step="1"
              disabled={disabled}
              placeholder="0"
              value={minutesDraft}
              onChange={(e) => handleMinutesChange(e.target.value)}
              className={cn(
                "w-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 pr-12 focus:border-sky-600 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed",
                error && "border-rose-500 focus:border-rose-600"
              )}
            />
            <span className="pointer-events-none absolute right-3 text-[11px] font-semibold text-gray-400">
              menit
            </span>
          </div>
        </div>
      </div>

      {/* Live Converter Result Indicator */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-1 text-[11px]">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock size={13} weight="bold" className="text-sky-600" />
          <span>Total:</span>
          <span className="font-bold text-sky-700">
            {currentTotal > 0 ? `${currentTotal} menit` : "0 menit"}
          </span>
          {currentTotal > 0 && (
            <span className="text-gray-400">({formatDuration(currentTotal)})</span>
          )}
        </div>
        <span className="text-[10px] text-gray-400">
          Auto konversi ke Sicmundus (menit)
        </span>
      </div>

      {/* Quick Presets */}
      {showPresets && (
        <div className="pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-0.5">
              Quick:
            </span>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = preset.minutes === currentTotal;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePresetSelect(preset.minutes)}
                  className={cn(
                    "border px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50",
                    isSelected
                      ? "border-sky-600 bg-sky-50 text-sky-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
