"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TestCaseRow } from "@/components/test-management/test-case-detail-helpers";

const STORAGE_PREFIX = "tc-draft-";
const DEBOUNCE_MS = 500;

function getStorageKey(suiteId: string) {
  return `${STORAGE_PREFIX}${suiteId}`;
}

function isSSR() {
  return typeof window === "undefined";
}

/**
 * Reads a saved draft from localStorage.
 * Returns null if nothing is stored or data is corrupted.
 */
export function readLocalDraft(suiteId: string): TestCaseRow | null {
  if (isSSR()) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(suiteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Validate minimum shape
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.testSuiteId !== "string" ||
      typeof parsed.tcId !== "string" ||
      typeof parsed.caseName !== "string"
    ) {
      localStorage.removeItem(getStorageKey(suiteId));
      return null;
    }
    return parsed as unknown as TestCaseRow;
  } catch {
    // Corrupted data — remove it
    try {
      localStorage.removeItem(getStorageKey(suiteId));
    } catch {
      // quota or security error — ignore
    }
    return null;
  }
}

/**
 * Hook that provides debounced save and clear functions for draft persistence.
 */
export function useLocalDraft(suiteId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (row: TestCaseRow) => {
      if (isSSR()) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(getStorageKey(suiteId), JSON.stringify(row));
        } catch {
          // Quota exceeded or security error — silently ignore
        }
      }, DEBOUNCE_MS);
    },
    [suiteId],
  );

  const clearDraft = useCallback(() => {
    if (isSSR()) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      localStorage.removeItem(getStorageKey(suiteId));
    } catch {
      // ignore
    }
  }, [suiteId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { saveDraft, clearDraft };
}
