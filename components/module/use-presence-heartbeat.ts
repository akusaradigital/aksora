"use client";

import { useEffect, useRef, useCallback } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds
const INACTIVITY_TIMEOUT_MS = 5 * 60_000; // 5 minutes

/**
 * usePresenceHeartbeat - sends periodic heartbeat POSTs to the presence API
 * while the dashboard is open and the user is active.
 *
 * Behavior:
 * - On mount: sends initial heartbeat, starts 60-second interval
 * - Tracks activity: listens for mousemove, keydown, touchstart events
 * - If no activity for 5 minutes: stops sending heartbeats (user is idle)
 * - If activity resumes: restarts heartbeat interval
 * - On page unload (beforeunload): sends disconnect via navigator.sendBeacon
 * - On component unmount: sends disconnect, clears intervals
 *
 * Requirements: 9.2, 9.3, 9.6
 */
export function usePresenceHeartbeat() {
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  const isMountedRef = useRef(false);

  const sendHeartbeat = useCallback(() => {
    fetch("/api/dashboard/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "heartbeat" }),
    }).catch(() => {
      // Silently ignore heartbeat failures - presence is best-effort
    });
  }, []);

  const sendDisconnect = useCallback(() => {
    // Use sendBeacon for reliability on page unload
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({ action: "disconnect" })],
        { type: "application/json" }
      );
      navigator.sendBeacon("/api/dashboard/presence", blob);
    } else {
      // Fallback to fetch (less reliable on unload but works for unmount)
      fetch("/api/dashboard/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  const startHeartbeatInterval = useCallback(() => {
    // Clear any existing interval before starting a new one
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  const stopHeartbeatInterval = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    // Clear existing inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // If user was idle, resume heartbeats
    if (isIdleRef.current) {
      isIdleRef.current = false;
      sendHeartbeat(); // Send immediate heartbeat on activity resume
      startHeartbeatInterval();
    }

    // Set new inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      stopHeartbeatInterval();
    }, INACTIVITY_TIMEOUT_MS);
  }, [sendHeartbeat, startHeartbeatInterval, stopHeartbeatInterval]);

  useEffect(() => {
    isMountedRef.current = true;

    // Send initial heartbeat on mount
    sendHeartbeat();

    // Start the 60-second heartbeat interval
    startHeartbeatInterval();

    // Start the inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      stopHeartbeatInterval();
    }, INACTIVITY_TIMEOUT_MS);

    // Activity event listeners
    const handleActivity = () => {
      if (isMountedRef.current) {
        resetInactivityTimer();
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    // Disconnect on page unload
    const handleBeforeUnload = () => {
      sendDisconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;

      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Stop heartbeat interval
      stopHeartbeatInterval();

      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      // Send disconnect on unmount
      sendDisconnect();
    };
  }, [sendHeartbeat, sendDisconnect, startHeartbeatInterval, stopHeartbeatInterval, resetInactivityTimer]);
}
