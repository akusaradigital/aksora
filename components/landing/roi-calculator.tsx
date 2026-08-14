"use client";

import { useState } from "react";
import Link from "next/link";

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function RoiCalculator() {
  const [teamSize, setTeamSize] = useState(5);
  const [hoursWasted, setHoursWasted] = useState(8);

  const hoursSavedWeek = Math.round(teamSize * hoursWasted * 0.7);
  const hoursSavedMonth = hoursSavedWeek * 4;
  const costSavedMonth = hoursSavedMonth * 50;
  const costSavedYear = costSavedMonth * 12;

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">Estimate</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">How much time could your team get back?</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
          Adjust the inputs to see a rough estimate for your team.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-600">Team size</span>
              <span className="text-[13px] font-semibold text-slate-950">{teamSize} people</span>
            </label>
            <input
              type="range"
              min={2}
              max={50}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full cursor-pointer appearance-auto accent-blue-600"
              aria-label="Team size slider"
            />
            <div className="mt-1 flex justify-between">
              <span className="text-[10px] text-slate-400">2</span>
              <span className="text-[10px] text-slate-400">50</span>
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-600">Hours wasted on manual QA tracking / week</span>
              <span className="text-[13px] font-semibold text-slate-950">{hoursWasted}h / person</span>
            </label>
            <input
              type="range"
              min={2}
              max={20}
              value={hoursWasted}
              onChange={(e) => setHoursWasted(Number(e.target.value))}
              className="w-full cursor-pointer appearance-auto accent-blue-600"
              aria-label="Hours wasted per week slider"
            />
            <div className="mt-1 flex justify-between">
              <span className="text-[10px] text-slate-400">2h</span>
              <span className="text-[10px] text-slate-400">20h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 bg-white p-8">
        <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Your estimated savings</p>
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-[13px] text-slate-500">Hours saved / week</span>
            <span className="text-xl font-semibold text-emerald-600">{hoursSavedWeek}h</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-[13px] text-slate-500">Hours saved / month</span>
            <span className="text-xl font-semibold text-emerald-600">{hoursSavedMonth}h</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-[13px] text-slate-500">Cost saved / month</span>
            <span className="text-xl font-semibold text-emerald-600">${formatNumber(costSavedMonth)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-500">Cost saved / year</span>
            <span className="text-2xl font-semibold text-slate-950">${formatNumber(costSavedYear)}</span>
          </div>
        </div>
        <p className="mt-5 text-[10px] text-slate-400">Example estimate only.</p>
        <Link href="/login" className="mt-6 block bg-blue-600 px-4 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-blue-700">
          Create account
        </Link>
      </div>
    </div>
  );
}
