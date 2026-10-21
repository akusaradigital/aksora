"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";

type AssignmentEvent = {
  type: "task_assigned" | "bug_assigned";
  id: number;
  title: string;
  priority: string;
  workspace: string;
  href: string;
  message: string;
};

// Listens to /api/notifications/stream SSE and toasts when a new assignment arrives.
// ponytail: reconnects once on close; no exponential backoff — add if flakiness is observed in prod.
export function useAssignmentNotifications(enabled = true) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource("/api/notifications/stream");
      esRef.current = es;

      es.addEventListener("assignment", (event) => {
        try {
          const data = JSON.parse(event.data) as AssignmentEvent;
          toast(data.message, "info");
        } catch {
          // malformed event — ignore
        }
      });

      es.addEventListener("error", () => {
        es.close();
        esRef.current = null;
        // Reconnect once after 15s if connection drops
        reconnectTimerRef.current = setTimeout(connect, 15000);
      });
    }

    connect();

    // Close the SSE connection while the tab is backgrounded so the serverless
    // function isn't kept alive polling for a tab nobody is looking at, and
    // reconnect when the tab becomes visible again.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        esRef.current?.close();
        esRef.current = null;
      } else if (!esRef.current) {
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
    };
  }, [enabled]);
}
