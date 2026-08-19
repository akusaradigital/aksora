"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SCRIPT_SRC}"]`,
    );

    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      existing.addEventListener(
        "load",
        () => {
          resolve();
        },
        { once: true },
      );

      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

export function GoogleSignInButton({ inviteToken }: { inviteToken?: string }) {
  const router = useRouter();
  const buttonHostRef = useRef<HTMLDivElement | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Resolve Google's auth state immediately to know our session token.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let mounted = true;

    function init() {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response: { credential?: string }) => {
          setPending(true);
          setError("");
          try {
            const next =
              new URLSearchParams(window.location.search).get("next") || "/dashboard";
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential, inviteToken }),
            });
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
              ok?: boolean;
              role?: string;
              company?: string;
            };
            if (!res.ok) {
              setError(data.error || "Google sign-in failed.");
              setPending(false);
              return;
            }
            const isPlatformSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
            router.push(isPlatformSuperAdmin ? "/admin/overview" : next);
            router.refresh();
            toast("Signed in with Google", "success");
          } catch {
            setError("Network error. Please try again.");
            setPending(false);
          }
        },
      });
      if (buttonHostRef.current && window.google?.accounts?.id) {
        const buttonWidth = buttonHostRef.current.clientWidth || buttonHostRef.current.offsetWidth || 300;
        window.google.accounts.id.renderButton(buttonHostRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          type: "standard",
          width: buttonWidth,
          text: "continue_with",
        });
      }
    }

    loadGsiScript().then(() => {
      if (!mounted) return;
      init();
      setScriptLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, [router, inviteToken]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-center text-xs font-bold text-slate-400">
        Google sign-in is not configured. Please sign in with email instead.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {!scriptLoaded && (
        <p className="text-center text-[11px] font-semibold text-slate-400">
        Loading Google sign-in…
        </p>
      )}
      <div ref={buttonHostRef} />
      {pending && (
        <p className="text-center text-[11px] font-semibold text-blue-600">
          Signing you in…
        </p>
      )}
      {error && (
        <p className="text-center text-[11px] font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}
