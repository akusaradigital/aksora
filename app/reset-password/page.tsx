"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeSlash, ArrowRight, CheckCircle, Warning } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setPending(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Warning size={24} weight="bold" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Invalid Reset Link</h2>
        <p className="text-sm text-slate-600">This password reset link is missing a valid token. Please request a new link.</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle size={24} weight="bold" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Password Reset Successful</h2>
        <p className="text-sm text-slate-600">Your password has been securely updated. You can now sign in with your new password.</p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
          >
            <span>Sign In to Your Account</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeSlash size={16} weight="bold" /> : <Eye size={16} weight="bold" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirm ? <EyeSlash size={16} weight="bold" /> : <Eye size={16} weight="bold" />}
          </button>
        </div>
      </div>

      {error && <InlineAlert variant="error" message={error} compact className="px-1" />}

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/15 transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50"
        >
          <span>{pending ? "Updating Password..." : "Update Password"}</span>
          {!pending && <ArrowRight size={16} weight="bold" />}
        </button>
      </div>

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Lock size={20} weight="bold" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Set New Password</h1>
          <p className="mt-1 text-sm text-slate-500">Create a secure new password for your Aksora account.</p>
        </div>

        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-slate-100" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
