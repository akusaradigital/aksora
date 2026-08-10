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
            const isSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
            router.push(isSuperAdmin ? "/admin/overview" : next);
            router.refresh();
            toast("Signed in with Google", "success");
          } catch {
            setError("Network error. Please try again.");
            setPending(false);
          }
        },
      });
      if (buttonHostRef.current && window.google?.accounts?.id) {
        window.google.accounts.id.renderButton(buttonHostRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          type: "standard",
          width: "100%",
          text: "continue_with",
        });
      }
    }

    if (window.google?.accounts?.id) {
      init();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      const load = () => {
        if (!mounted) return;
        init();
        setScriptLoaded(true);
      };
      if (existing) {
        existing.addEventListener("load", load, { once: true });
      } else {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = load;
        document.head.appendChild(s);
      }
    }

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