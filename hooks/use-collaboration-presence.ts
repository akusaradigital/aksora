"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type CollaborationEditor = {
  userId: number;
  userName: string;
  module: string;
  itemId: string;
  action: "viewing" | "editing";
  updatedAt: string;
};

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const POLL_INTERVAL = 15_000; // 15 seconds

/**
 * useCollaborationPresence - tracks and displays who else is viewing/editing
 * the same module item in real-time.
 *
 * Usage:
 *   const { editors, setAction } = useCollaborationPresence("bugs", "42");
 *
 * - Sends heartbeat every 30s while the item is open
 * - Polls for other editors every 15s
 * - Sends "leave" on unmount or page unload
 * - setAction("editing") to indicate active editing
 */
export function useCollaborationPresence(module: string, itemId: string | number | null) {
  const [editors, setEditors] = useState<CollaborationEditor[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionRef = useRef<"viewing" | "editing">("viewing");
  const mountedRef = useRef(true);

  const sendPresence = useCallback((action: "viewing" | "editing" | "leave") => {
    if (!module || !itemId) return;
    const body = JSON.stringify({ module, itemId: String(itemId), action });

    if (action === "leave" && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/collaboration", blob);
      return;
    }

    fetch("/api/collaboration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: action === "leave",
    }).catch(() => {});
  }, [module, itemId]);

  const fetchEditors = useCallback(async () => {
    if (!module || !itemId || !mountedRef.current) return;
    try {
      const res = await fetch(`/api/collaboration?module=${encodeURIComponent(module)}&itemId=${encodeURIComponent(String(itemId))}`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setEditors(data.editors || []);
        }
      }
    } catch {
      // Non-critical
    }
  }, [module, itemId]);

  const setAction = useCallback((action: "viewing" | "editing") => {
    actionRef.current = action;
    sendPresence(action);
  }, [sendPresence]);

  useEffect(() => {
    if (!module || !itemId) return;

    mountedRef.current = true;

    // Initial presence + fetch
    sendPresence(actionRef.current);
    fetchEditors();

    // Heartbeat interval
    heartbeatRef.current = setInterval(() => {
      sendPresence(actionRef.current);
    }, HEARTBEAT_INTERVAL);

    // Poll for other editors
    pollRef.current = setInterval(fetchEditors, POLL_INTERVAL);

    // Leave on page unload
    const handleUnload = () => sendPresence("leave");
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("beforeunload", handleUnload);

      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pollRef.current) clearInterval(pollRef.current);

      sendPresence("leave");
    };
  }, [module, itemId, sendPresence, fetchEditors]);

  return { editors, setAction };
}

/**
 * useModuleCollaboration - lightweight hook for list views.
 * Polls all active editors in a module (no heartbeat, just read).
 */
export function useModuleCollaboration(module: string) {
  const [editorsByItem, setEditorsByItem] = useState<Map<string, CollaborationEditor[]>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!module) return;
    mountedRef.current = true;

    const fetchAll = async () => {
      try {
        const res = await fetch(`/api/collaboration?module=${encodeURIComponent(module)}`);
        if (res.ok && mountedRef.current) {
          const data = await res.json();
          const grouped = new Map<string, CollaborationEditor[]>();
          for (const editor of (data.editors || [])) {
            const list = grouped.get(editor.itemId) || [];
            list.push(editor);
            grouped.set(editor.itemId, list);
          }
          setEditorsByItem(grouped);
        }
      } catch {
        // Non-critical
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [module]);

  return editorsByItem;
}
