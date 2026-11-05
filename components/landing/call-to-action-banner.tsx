"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Sparkle } from "@phosphor-icons/react";

export function CallToActionBanner() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      router.push(`/login?email=${encodeURIComponent(email.trim())}`);
    } else {
      router.push("/login");
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 bg-white dark:bg-slate-950 transition-colors">
      <div className="relative rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 px-6 py-16 sm:px-12 sm:py-24 text-center text-white shadow-2xl overflow-hidden">
        {/* Subtle background radial highlights */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-blue-900/40 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight">
            Let&apos;s Start Something Great
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Consolidate your test planning, run execution, bug tracking, and standup workflows into one cohesive, high-velocity engineering platform.
          </p>

          {/* Centered Pill Search / Registration Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 mx-auto flex max-w-xl items-center rounded-full bg-white p-2 pl-6 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-white/30"
          >
            <MagnifyingGlass size={18} className="text-slate-400 mr-2 shrink-0" weight="bold" />
            <input
              type="email"
              placeholder="Enter your work email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-[#a3e635] px-6 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-[#bef264] hover:shadow-lg"
            >
              Start Free
            </button>
          </form>

          <p className="mt-4 text-[11px] text-blue-200/80">
            Free tier available • No credit card required • Instant workspace activation
          </p>
        </div>
      </div>
    </section>
  );
}
