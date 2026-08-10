"use client";

import { useEffect, useRef } from "react";
import {
  parseViewId,
  parseTabParam,
  preserveQueryParams,
} from "@/lib/shareable-url";
import type { ModuleKey } from "@/lib/modules";

type Row = Record<string, string | number> & { id: string | number; publicToken?: string };

export interface UseDetailViewUrlOptions {
  module: ModuleKey;
  viewingRow: Row | null;
  initialViewId: string | null | undefined;
  localRows: Row[];
  onOpenRow: (row: Row) => void;
  onCloseRow: () => void;
  onNotFound: () => void;
  onAccessDenied: () => void;
  activeTab?: string | null;
  onTabChange?: (tab: string | null) => void;
}

/**
 * Returns the publicToken for a row, falling back to id if token is empty.
 */
function getRowToken(row: Row): string {
  const token = String(row.publicToken ?? "").trim();
  return token || String(row.id);
}

/**
 * Custom hook that synchronizes the detail view modal state with the browser URL.
 *
 * - On mount with `initialViewId`: finds the row in `localRows` or fetches from API
 * - On `viewingRow` change: pushState/replaceState to update URL with `?view={token}`
 * - On close: pushState to remove `?view` param while preserving other params
 * - Listens to `popstate` to sync modal open/close with URL state
 * - Uses `replaceState` for direct URL navigation so back button goes to referrer
 */
export function useDetailViewUrl({
  module,
  viewingRow,
  initialViewId,
  localRows,
  onOpenRow,
  onCloseRow,
  onNotFound,
  onAccessDenied,
  activeTab,
  onTabChange,
}: UseDetailViewUrlOptions): void {
  // Track whether the current open was triggered by initial URL load
  const openedFromUrlRef = useRef(false);
  // Track whether initial load has been handled
  const initialLoadHandledRef = useRef(false);
  // Track the previous viewingRow to detect open/close transitions
  const prevViewingRowRef = useRef<Row | null>(null);
  // Suppress popstate handling during programmatic history changes
  const suppressPopstateRef = useRef(false);
  // Track the previous activeTab to detect tab changes
  const prevActiveTabRef = useRef<string | null | undefined>(activeTab);

  // Handle initial mount: if initialViewId is present, open the matching row
  useEffect(() => {
    if (initialLoadHandledRef.current) return;
    initialLoadHandledRef.current = true;

    const parsedToken = parseViewId(initialViewId);
    if (parsedToken === null) return;

    // Check for initial tab param from URL
    const initialTabParam =
      typeof window !== "undefined"
        ? parseTabParam(
            new URLSearchParams(window.location.search).get("tab"),
          )
        : null;

    // If the view param is a numeric ID (legacy URL), resolve to token and redirect
    const isNumericId = /^\d+$/.test(parsedToken) && parseInt(parsedToken, 10) > 0;
    if (isNumericId) {
      // Try to find by numeric id in localRows first
      const foundById = localRows.find((row) => String(row.id) === parsedToken);
      if (foundById) {
        // Redirect URL to use token
        const token = String(foundById.publicToken ?? "").trim() || parsedToken;
        const params = new URLSearchParams(window.location.search);
        params.set("view", token);
        window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
        openedFromUrlRef.current = true;
        onOpenRow(foundById);
        if (initialTabParam && onTabChange) {
          onTabChange(initialTabParam);
        }
        return;
      }

      // Not found locally, resolve via API
      async function resolveAndOpen() {
        try {
          const resolveRes = await fetch(`/api/resolve-view?module=${module}&id=${parsedToken}`);
          if (resolveRes.ok) {
            const { publicToken } = await resolveRes.json();
            if (publicToken) {
              // Redirect URL
              const params = new URLSearchParams(window.location.search);
              params.set("view", publicToken);
              window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
              // Now fetch the item by token
              const itemRes = await fetch(`/api/items/${module}/${publicToken}`);
              if (itemRes.ok) {
                const data = await itemRes.json();
                if (data.item) {
                  openedFromUrlRef.current = true;
                  onOpenRow(data.item as Row);
                  if (initialTabParam && onTabChange) {
                    onTabChange(initialTabParam);
                  }
                  return;
                }
              }
            }
          }
          onNotFound();
        } catch {
          onNotFound();
        }
      }
      resolveAndOpen();
      return;
    }

    // Try to find the row in localRows by publicToken or by id
    const found = localRows.find((row) => {
      const rowToken = String(row.publicToken ?? "").trim();
      if (rowToken && rowToken === parsedToken) return true;
      // Fallback: match by numeric id for backward compatibility
      if (String(row.id) === parsedToken) return true;
      return false;
    });

    if (found) {
      openedFromUrlRef.current = true;
      onOpenRow(found);
      if (initialTabParam && onTabChange) {
        onTabChange(initialTabParam);
      }
      return;
    }

    // Not found locally - fetch from API using token
    async function fetchItem() {
      try {
        const res = await fetch(`/api/items/${module}/${parsedToken}`);
        if (res.ok) {
          const data = await res.json();
          if (data.item) {
            openedFromUrlRef.current = true;
            onOpenRow(data.item as Row);
            if (initialTabParam && onTabChange) {
              onTabChange(initialTabParam);
            }
          } else {
            onNotFound();
          }
        } else if (res.status === 403) {
          onAccessDenied();
        } else {
          onNotFound();
        }
      } catch {
        onNotFound();
      }
    }

    fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL when viewingRow changes
  useEffect(() => {
    const prev = prevViewingRowRef.current;
    prevViewingRowRef.current = viewingRow;

    if (typeof window === "undefined") return;

    const currentParams = new URLSearchParams(window.location.search);

    if (viewingRow && !prev) {
      // Modal just opened - use publicToken in URL
      const token = getRowToken(viewingRow);
      const newParams = preserveQueryParams(currentParams, token);
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;

      if (openedFromUrlRef.current) {
        // Opened from initial URL load - use replaceState so back goes to referrer
        window.history.replaceState(null, "", newUrl);
        openedFromUrlRef.current = false;
      } else {
        // Opened via user click - push new history entry
        suppressPopstateRef.current = true;
        window.history.pushState(null, "", newUrl);
        suppressPopstateRef.current = false;
      }
    } else if (!viewingRow && prev) {
      // Modal just closed (not from popstate)
      const currentViewParam = currentParams.get("view");
      if (currentViewParam) {
        // Only push if URL still has ?view (i.e., close wasn't triggered by popstate)
        const newParams = preserveQueryParams(currentParams, undefined, true, {
          removeTab: true,
        });
        const paramStr = newParams.toString();
        const newUrl = paramStr
          ? `${window.location.pathname}?${paramStr}`
          : window.location.pathname;
        suppressPopstateRef.current = true;
        window.history.pushState(null, "", newUrl);
        suppressPopstateRef.current = false;
      }
    }
  }, [viewingRow]);

  // Sync URL tab param when activeTab changes (replaceState - no new history entry)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prev = prevActiveTabRef.current;
    prevActiveTabRef.current = activeTab;

    // Only update URL if the tab actually changed and the modal is open
    if (activeTab === prev) return;
    if (!viewingRow) return;

    const currentParams = new URLSearchParams(window.location.search);
    const currentTabInUrl = currentParams.get("tab");

    // Determine the desired tab in URL
    const desiredTab = activeTab || null;

    // Skip if URL already matches
    if (desiredTab === currentTabInUrl) return;

    let newParams: URLSearchParams;
    if (desiredTab) {
      newParams = preserveQueryParams(currentParams, undefined, false, {
        addTab: desiredTab,
      });
    } else {
      newParams = preserveQueryParams(currentParams, undefined, false, {
        removeTab: true,
      });
    }

    const paramStr = newParams.toString();
    const newUrl = paramStr
      ? `${window.location.pathname}?${paramStr}`
      : window.location.pathname;

    // Use replaceState - tab switches shouldn't create new history entries
    window.history.replaceState(null, "", newUrl);
  }, [activeTab, viewingRow]);

  // Listen to popstate for back/forward navigation
  useEffect(() => {
    function handlePopstate() {
      if (suppressPopstateRef.current) return;

      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      const parsedToken = parseViewId(viewParam);

      if (parsedToken !== null) {
        // URL has ?view - open the modal if not already open for this token
        const currentToken = viewingRow ? getRowToken(viewingRow) : null;
        if (!viewingRow || currentToken !== parsedToken) {
          const found = localRows.find((row) => {
            const rowToken = String(row.publicToken ?? "").trim();
            if (rowToken && rowToken === parsedToken) return true;
            if (String(row.id) === parsedToken) return true;
            return false;
          });
          if (found) {
            openedFromUrlRef.current = true;
            onOpenRow(found);
          }
        }

        // Sync tab state from URL on popstate
        if (onTabChange) {
          const tabParam = parseTabParam(params.get("tab"));
          onTabChange(tabParam);
        }
      } else {
        // URL has no ?view - close the modal if open
        if (viewingRow) {
          // Set prevViewingRowRef to null to prevent the URL sync effect from pushing state
          prevViewingRowRef.current = null;
          onCloseRow();
        }
      }
    }

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [viewingRow, localRows, onOpenRow, onCloseRow, onTabChange]);
}
