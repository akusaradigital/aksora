"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function RoiCalculator() {
  const [teamSize, setTeamSize] = useState(5);
  const [hoursWasted, setHoursWasted] = useState(8);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hoursSavedWeek = Math.round(teamSize * hoursWasted * 0.7);
  const hoursSavedMonth = hoursSavedWeek * 4;
  const costSavedMonth = hoursSavedMonth * 50;
  const costSavedYear = costSavedMonth * 12;

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-2">ROI Calculator</p>
        <h2 className="text-2xl font-bold">How much time will your team save?</h2>
        <p className="mt-3 text-[13px] text-gray-400 leading-relaxed">
          QA teams waste hours every week on manual tracking, compiling reports, and searching for information. See what you could save.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-gray-300">Team size</span>
              <span className="text-[13px] font-bold text-white">{teamSize} people</span>
            </label>
            <input
              type="range"
              min={2}
              max={50}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 appearance-auto accent-blue-500 cursor-pointer"
              aria-label="Team size slider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-600">2</span>
              <span className="text-[10px] text-gray-600">50</span>
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-gray-300">Hours wasted on manual QA tracking / week</span>
              <span className="text-[13px] font-bold text-white">{hoursWasted}h / person</span>
            </label>
            <input
              type="range"
              min={2}
              max={20}
              value={hoursWasted}
              onChange={(e) => setHoursWasted(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 appearance-auto accent-blue-500 cursor-pointer"
              aria-label="Hours wasted per week slider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-600">2h</span>
              <span className="text-[10px] text-gray-600">20h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.03] p-8">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-6">Your estimated savings</p>
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <span className="text-[13px] text-gray-400">Hours saved / week</span>
            <span className="text-xl font-bold text-emerald-400">{hoursSavedWeek}h</span>
          </div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <span className="text-[13px] text-gray-400">Hours saved / month</span>
            <span className="text-xl font-bold text-emerald-400">{hoursSavedMonth}h</span>
          </div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <span className="text-[13px] text-gray-400">Cost saved / month</span>
            <span className="text-xl font-bold text-emerald-400">${mounted ? formatNumber(costSavedMonth) : "---"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-400">Cost saved / year</span>
            <span className="text-2xl font-bold text-white">${mounted ? formatNumber(costSavedYear) : "---"}</span>
          </div>
        </div>
        <p className="mt-5 text-[10px] text-gray-500">* Based on 70% efficiency gain and $50/hr average cost</p>
        <Link href="/login" className="mt-6 block text-center bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-500 transition-colors">
          Start Saving Time Today →
        </Link>
      </div>
    </div>
  );
}
