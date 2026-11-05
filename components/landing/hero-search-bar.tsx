"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";

export function HeroSearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/login?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/login");
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="mx-auto mt-8 flex max-w-xl items-center rounded-full bg-white p-2 pl-6 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-white/30"
    >
      <MagnifyingGlass size={18} className="text-slate-400 mr-2.5 shrink-0" weight="bold" />
      <input
        type="text"
        placeholder="Search test suites, bugs, or enter work email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-[#a3e635] px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-[#bef264] hover:shadow-lg"
      >
        Register
      </button>
    </form>
  );
}
