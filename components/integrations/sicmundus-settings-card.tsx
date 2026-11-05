"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  WarningCircle,
  Eye,
  EyeSlash,
  LockKey,
  ArrowsClockwise,
  Trash,
  PlugsConnected,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import {
  getStoredSicmundusCreds,
  setStoredSicmundusCreds,
  clearStoredSicmundusCreds,
  type StoredSicmundusCreds,
} from "@/lib/sicmundus-client";

export function SicmundusSettingsCard() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [savedCreds, setSavedCreds] = useState<StoredSicmundusCreds | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const creds = getStoredSicmundusCreds();
    if (creds) {
      setSavedCreds(creds);
      setUsername(creds.username || "");
      setPassword(creds.password || "");
    }
  }, []);

  const handleValidateAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password;

    if (!cleanUser || !cleanPass) {
      setFeedback({
        type: "error",
        message: "Please enter both your Sicmundus username and password.",
      });
      return;
    }

    setIsValidating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/integrations/sicmundus/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Authentication failed. Check your username and password.");
      }

      const validatedEntry: StoredSicmundusCreds = {
        username: cleanUser,
        password: cleanPass,
        validated: true,
        userId: json.user?.id,
        userName: json.user?.name,
        userEmail: json.user?.email,
        lastValidatedAt: new Date().toISOString(),
      };

      setStoredSicmundusCreds(validatedEntry);
      setSavedCreds(validatedEntry);
      setFeedback({
        type: "success",
        message: `Connected successfully as ${json.user?.name || cleanUser}!`,
      });
      toast("Sicmundus credentials verified and saved to browser", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to validate credentials";
      setFeedback({ type: "error", message: msg });
      toast(msg, "error");
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = () => {
    clearStoredSicmundusCreds();
    setSavedCreds(null);
    setUsername("");
    setPassword("");
    setFeedback(null);
    toast("Sicmundus credentials removed from browser", "info");
  };

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <PlugsConnected size={20} weight="bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Sicmundus Task &amp; Time Tracking</h3>
              {savedCreds?.validated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle size={12} weight="bold" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Not Configured
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Personal credentials for auto-syncing daily work logs, creating subtasks, and recording hours.
            </p>
          </div>
        </div>

        {savedCreds && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <Trash size={13} weight="bold" />
            <span>Disconnect</span>
          </button>
        )}
      </div>

      {/* Privacy Notice Banner */}
      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-200/80 bg-blue-50/60 p-3 text-xs text-blue-900">
        <LockKey size={16} weight="bold" className="mt-0.5 shrink-0 text-blue-700" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-blue-950">Client-Side Storage Guarantee:</strong> Your Sicmundus credentials are stored exclusively in your browser&apos;s localStorage and sent ephemerally only when performing sync actions. They are{" "}
          <strong className="underline decoration-blue-400">never stored</strong> in Vercel or the PostgreSQL database.
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle size={16} weight="bold" className="shrink-0 text-emerald-600" />
          ) : (
            <WarningCircle size={16} weight="bold" className="shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleValidateAndSave} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sicmundus Username / Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john.doe@company.com"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sicmundus Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash size={15} weight="bold" /> : <Eye size={15} weight="bold" />}
              </button>
            </div>
          </div>
        </div>

        {savedCreds?.userName && (
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600">
            <div>
              <span className="text-slate-400">Connected Profile: </span>
              <strong className="text-slate-900">{savedCreds.userName}</strong>
              {savedCreds.userEmail && <span className="text-slate-500"> ({savedCreds.userEmail})</span>}
            </div>
            {savedCreds.lastValidatedAt && (
              <span className="text-[11px] text-slate-400 font-mono">
                Validated: {new Date(savedCreds.lastValidatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isValidating || !username.trim() || !password}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isValidating && <ArrowsClockwise size={13} weight="bold" className="animate-spin" />}
            <span>{isValidating ? "Validating with Sicmundus..." : savedCreds?.validated ? "Re-validate & Update" : "Validate & Save to Browser"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
