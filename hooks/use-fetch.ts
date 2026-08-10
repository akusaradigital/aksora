"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FetchState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

type UseFetchOptions = {
  /** Skip the initial fetch on mount */
  skip?: boolean;
  /** Cache TTL in ms (default: 0 = no cache) */
  cacheTtl?: number;
};

const fetchCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Hook for fetching data with automatic abort on unmount/refetch.
 * Prevents stale responses from overwriting fresh data.
 */
export function useFetch<T = unknown>(url: string | null, options: UseFetchOptions = {}) {
  const { skip = false, cacheTtl = 0 } = options;
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: !skip && !!url,
  });
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (fetchUrl?: string) => {
    const targetUrl = fetchUrl ?? url;
    if (!targetUrl) return;

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Check cache
    if (cacheTtl > 0) {
      const cached = fetchCache.get(targetUrl);
      if (cached && cached.expiresAt > Date.now()) {
        setState({ data: cached.data as T, error: null, loading: false });
        return;
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(targetUrl, { signal: controller.signal });
      if (!mountedRef.current) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as T;
      if (!mountedRef.current) return;

      // Store in cache
      if (cacheTtl > 0) {
        fetchCache.set(targetUrl, { data, expiresAt: Date.now() + cacheTtl });
      }

      setState({ data, error: null, loading: false });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (!mountedRef.current) return;
      setState({ data: null, error: err instanceof Error ? err.message : "Unknown error", loading: false });
    }
  }, [url, cacheTtl]);

  useEffect(() => {
    mountedRef.current = true;
    if (!skip && url) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [url, skip, fetchData]);

  return { ...state, refetch: fetchData };
}
