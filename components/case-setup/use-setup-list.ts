"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

/** Loads a `{ data: T[] }` list from `endpoint` and exposes save/remove helpers for `${endpoint}/[id]`. */
export function useSetupList<T extends { id?: number }>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load.");
      setItems(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  /** Returns an error message, or null on success. */
  const save = async (id: number | undefined, body: unknown): Promise<string | null> => {
    const res = await fetch(id ? `${endpoint}/${id}` : endpoint, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json.error || "Failed to save.";
    toast("Saved", "success");
    load();
    return null;
  };

  const remove = async (id: number) => {
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) toast("Deleted", "success");
    else toast(json.error || "Failed to delete.", "error");
    load();
  };

  return { items, loading, error, save, remove };
}
