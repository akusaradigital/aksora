"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/hooks/use-translation";
import { interpolate } from "@/lib/i18n/interpolate";

const inputClass =
  "w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold text-slate-900 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none";

export function OtpVerifyForm({ email, onVerified, onBack }: { email: string; onVerified: () => void; onBack: () => void }) {
  const { dict: t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.trim().length !== 6) {
      setError(t.otp.errorEnterCode);
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const retryAfter = Number(res.headers.get("Retry-After")) || 0;
        if (retryAfter > 0) setCooldown(retryAfter);
        throw new Error(data.error || t.otp.errorInvalidCode);
      }
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.otp.errorVerificationFailed);
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resend: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const retryAfter = Number(res.headers.get("Retry-After")) || 0;
        if (retryAfter > 0) setCooldown(retryAfter);
        throw new Error(data.error || t.otp.errorCouldNotResend);
      }
      toast(t.otp.newCodeSent, "success");
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.otp.errorCouldNotResend);
    } finally {
      setResending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.otp.verificationCode}</label>
        <input
          type="text"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="000000"
          className={inputClass}
        />
      </div>

      {error && <InlineAlert variant="error" message={error} compact className="px-1" />}

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-5 py-3 text-sm font-semibold transition-all shadow-md shadow-blue-500/15 active:scale-[0.98] disabled:opacity-50"
        >
          <span>{pending ? t.otp.verifying : t.otp.verify}</span>
          {!pending && <ArrowRight size={16} weight="bold" />}
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 hover:text-blue-600">
          <ArrowLeft size={12} weight="bold" />
          <span>{t.common.backToSignIn}</span>
        </button>
        <button type="button" onClick={resend} disabled={resending || cooldown > 0} className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
          {resending ? t.otp.sending : cooldown > 0 ? interpolate(t.otp.resendCooldown, { seconds: cooldown }) : t.otp.resendCode}
        </button>
      </div>
    </form>
  );
}
