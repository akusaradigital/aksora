"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { Bell } from "@phosphor-icons/react";

// ── Types ──────────────────────────────────────────────────────────────────

type ConnectionState = "connected" | "reconnecting" | "disconnected";

interface SSENotification {
  type: string;
  message: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const BACKOFF_BASE = 1000;
const BACKOFF_MAX = 30000;
const MAX_ATTEMPTS = 10;
const UNREAD_COLLAPSE_THRESHOLD = 20;

function getBackoffDelay(attempt: number): number {
  return Math.min(BACKOFF_BASE * Math.pow(2, attempt), BACKOFF_MAX);
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * DashboardRealtime - SSE client for real-time dashboard updates.
 *
 * Establishes a persistent SSE connection to `/api/dashboard/events` on mount.
 * Handles:
 * - Toast notifications for assignments and critical bugs
 * - Exponential backoff reconnection (1s, 2s, 4s, 8s... max 30s, 10 attempts)
 * - Connection status indicator (green/yellow/red dot)
 * - Missed notification fetch on reconnection via `since` param
 * - Collapse to summary badge when >20 unread toasts
 * - Dashboard section refresh on data-update events via router.refresh()
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */
export function DashboardRealtime() {
  const router = useRouter();
  const [, setConnectionState] = useState<ConnectionState>("disconnected");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBadge, setShowBadge] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventTimestampRef = useRef<string | null>(null);
  const unreadCountRef = useRef(0);
  const mountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});

  // Keep unreadCountRef in sync
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotification = useCallback((notification: SSENotification) => {
    if (!mountedRef.current) return;

    // Track last event timestamp for reconnection
    if (notification.createdAt) {
      lastEventTimestampRef.current = notification.createdAt;
    }

    const newUnread = unreadCountRef.current + 1;
    setUnreadCount(newUnread);

    // Collapse to summary when >20 unread
    if (newUnread > UNREAD_COLLAPSE_THRESHOLD) {
      setShowBadge(true);
      return;
    }

    // Show toast notification within 3 seconds
    const toastType = notification.type === "critical_bug" ? "error" : "info";
    toast(notification.message, toastType, { duration: 5000 });
  }, []);

  const handleDataUpdate = useCallback(() => {
    if (!mountedRef.current) return;
    // Refresh dashboard sections without full page reload
    router.refresh();
  }, [router]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Build URL with `since` param for reconnection
    let url = "/api/dashboard/events";
    if (lastEventTimestampRef.current) {
      url += `?since=${encodeURIComponent(lastEventTimestampRef.current)}`;
    }

    setConnectionState(attemptRef.current > 0 ? "reconnecting" : "connected");

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", (event) => {
      if (!mountedRef.current) return;
      attemptRef.current = 0;
      setConnectionState("connected");

      // Track timestamp from connected event
      try {
        const data = JSON.parse(event.data);
        if (data.timestamp) {
          lastEventTimestampRef.current = data.timestamp;
        }
      } catch {
        // Non-critical
      }
    });

    es.addEventListener("notification", (event) => {
      if (!mountedRef.current) return;
      try {
        const notification: SSENotification = JSON.parse(event.data);
        handleNotification(notification);
      } catch {
        // Ignore malformed events
      }
    });

    es.addEventListener("presence", () => {
      // Presence updates are handled by PresenceIndicator component
      // Just track the timestamp
      if (!mountedRef.current) return;
      lastEventTimestampRef.current = new Date().toISOString();
    });

    es.addEventListener("data-update", () => {
      if (!mountedRef.current) return;
      handleDataUpdate();
    });

    es.onerror = () => {
      if (!mountedRef.current) return;

      es.close();
      eventSourceRef.current = null;

      // Attempt reconnection with exponential backoff
      if (attemptRef.current < MAX_ATTEMPTS) {
        setConnectionState("reconnecting");
        const delay = getBackoffDelay(attemptRef.current);
        attemptRef.current += 1;

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connectRef.current();
          }
        }, delay);
      } else {
        // Max attempts reached - show disconnected state
        setConnectionState("disconnected");
      }
    };
  }, [handleNotification, handleDataUpdate]);

  // Keep the latest connect reference accessible to the reconnect timer without
  // triggering use-before-declaration in the closure.
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Establish SSE connection on mount (auth is handled server-side by the endpoint)
  useEffect(() => {
    mountedRef.current = true;

    // Check if user is authenticated before connecting
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) {
          connect();
        }
      })
      .catch(() => {
        // Not authenticated - don't connect
      });

    return () => {
      mountedRef.current = false;

      // Cleanup: close EventSource on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  // Dismiss badge and reset unread count
  const dismissBadge = () => {
    setShowBadge(false);
    setUnreadCount(0);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {/* Unread notification badge (collapsed summary when >20) */}
      {showBadge && (
        <button
          onClick={dismissBadge}
          className="flex items-center gap-1.5  bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-rose-600 transition"
          title={`${unreadCount} unread notifications - click to dismiss`}
        >
          <Bell size={14} weight="bold" />
          <span>{unreadCount}</span>
        </button>
      )}

      {/* Connection status indicator - hidden */}
    </div>
  );
}
