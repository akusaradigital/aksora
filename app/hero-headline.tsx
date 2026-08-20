"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "aksora_hero_variant";

export function HeroHeadline({ variantA, variantB }: { variantA: ReactNode; variantB: ReactNode }) {
  const [variant, setVariant] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    let picked = localStorage.getItem(STORAGE_KEY) as "A" | "B" | null;
    if (picked !== "A" && picked !== "B") {
      picked = Math.random() < 0.5 ? "A" : "B";
      localStorage.setItem(STORAGE_KEY, picked);
    }
    setVariant(picked);
    fetch("/api/ab-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variant: picked, eventType: "view" }),
    }).catch(() => {});
  }, []);

  if (!variant) return <>{variantA}</>;
  return <>{variant === "A" ? variantA : variantB}</>;
}
