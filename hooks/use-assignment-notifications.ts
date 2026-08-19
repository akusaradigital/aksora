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

  useEffect(() => {
    if (!enabled) return;

    function connect() {
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
        // Reconnect once after 15s if connection drops
        setTimeout(connect, 15000);
      });
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [enabled]);
}
