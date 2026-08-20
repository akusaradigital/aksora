"use client";

import { Suspense, type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeSlash,
  ShieldCheck,
  ChartLine,
  Bug,
  Checks,
  Sparkle,
  Users
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FormFieldError } from "@/components/shared/form-field-error";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getPublicRoleOptions } from "@/lib/roles";
import { GoogleSignInButton } from "@/components/oauth/google-signin-button";
import { OtpVerifyForm } from "./otp-verify-form";
import { useTranslation } from "@/hooks/use-translation";
import { interpolate } from "@/lib/i18n/interpolate";

const inputClass =
  "w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none";
const selectClass =
  "w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none";

export function LoginContent() {
  const { dict: t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const inviteToken = searchParams.get("inviteToken") || "";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "verify-otp" | "verify-mfa">("signin");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [mfaTempToken, setMfaTempToken] = useState("");
  const [mfaTotpCode, setMfaTotpCode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    company: "",
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaTotpCode || mfaTotpCode.length !== 6) {
      setError(t.otp.errorEnterCode);
      return;
    }

    setPending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: mfaTempToken,
          code: mfaTotpCode,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t.login.authFailed);
      }

      const isPlatformSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
      router.push(isPlatformSuperAdmin ? "/admin/overview" : nextUrl);
      router.refresh();
      toast(t.login.welcomeBack, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.unexpectedError);
    } finally {
      setPending(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setError("");
  };

  const handleModeChange = (nextMode: typeof mode) => {
    setMode(nextMode);
    setShowPassword(false);
    setError("");
    setFieldErrors({});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    const requireField = (name: keyof typeof formData, message: string) => {
      if (!String(formData[name]).trim()) nextErrors[name] = message;
    };

    if (mode === "signup") {
      requireField("name", t.login.errorNameRequired);
      requireField("email", t.login.errorEmailRequired);
      requireField("password", t.login.errorPasswordRequired);
      if (inviteToken) {
        requireField("role", t.login.errorRoleRequired);
      } else {
        requireField("company", t.login.errorCompanyRequired);
      }
    } else if (mode === "forgot") {
      requireField("email", t.login.errorEmailRequired);
    } else {
      requireField("email", t.login.errorEmailRequired);
      requireField("password", t.login.errorPasswordRequired);
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("");
      return;
    }

    setPending(true);
    setError("");
    setFieldErrors({});

    if (mode === "forgot") {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || t.login.unexpectedError);
        }
        toast(t.login.resetLinkSent, "info");
        handleModeChange("signin");
      } catch (err) {
        setError(err instanceof Error ? err.message : t.login.unexpectedError);
      } finally {
        setPending(false);
      }
      return;
    }

    const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          company: formData.company,
          inviteToken: inviteToken || undefined,
          rememberMe: mode === "signin" ? rememberMe : undefined,
          turnstileToken: mode === "signup"
            ? (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value || ""
            : undefined,
        }),
      });

      if (mode === "signup") {
        (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
      }

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : { error: await res.text() };

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setVerifyEmail(formData.email);
          setMode("verify-otp");
          return;
        }
        throw new Error(data.error || t.login.authFailed);
      }

      if (data.requiresMfa && data.tempToken) {
        setMfaTempToken(data.tempToken);
        setMfaTotpCode("");
        setMode("verify-mfa");
        return;
      }

      if (mode === "signup") {
        if (data.requiresVerification) {
          setVerifyEmail(formData.email);
          setFormData({ name: "", email: "", password: "", role: "", company: "" });
          setMode("verify-otp");
          return;
        }
        setShowSuccessModal(true);
        setFormData({ name: "", email: "", password: "", role: "", company: "" });
        handleModeChange("signin");
        return;
      }

      const isPlatformSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
      router.push(isPlatformSuperAdmin ? "/admin/overview" : nextUrl);
      router.refresh();
      toast(t.login.welcomeBack, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.unexpectedError);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col md:flex-row">
      {/* Left panel - Visual Branding & Interactive Look */}
      <section className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 flex-col justify-between p-12 lg:p-16 border-r border-slate-200">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Ambient glow blobs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-purple-200/30 rounded-full blur-3xl" />

        {/* Logo and Brand */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-xl">
            A
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-950">
            Aksora
          </span>
        </div>

        {/* Value Proposition & Visual Mockup */}
        <div className="relative my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold tracking-wider text-blue-700 uppercase mb-6">
            <Sparkle size={12} weight="fill" />
            {t.login.leftBadge}
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-slate-950 max-w-lg">
            {t.login.leftHeadingLine1} <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600">
              {t.login.leftHeadingLine2}
            </span>
          </h2>
          <p className="mt-4 text-slate-600 text-base max-w-md leading-relaxed">
            {t.login.leftParagraph}
          </p>

          {/* Premium CSS-based UI mockup */}
          <div className="mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-5 backdrop-blur-md shadow-2xl shadow-slate-200/60">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">Aksora Dashboard v0.12.0</span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Checks size={16} weight="bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Execution Run #182</p>
                    <p className="text-[10px] text-slate-500">Workspace: QA-Daily-Hub</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200">Passed</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                    <Bug size={16} weight="bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Bug #401: Auth token crash</p>
                    <p className="text-[10px] text-slate-500">Reported by PM Admin</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-semibold border border-rose-200">High</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <ChartLine size={16} weight="bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Active Sprint 12</p>
                    <p className="text-[10px] text-slate-500">Sprint Goal: Core APIs stability</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold border border-blue-200">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 pt-6">
          <span>&copy; {new Date().getFullYear()} Aksora Platform.</span>
          <span className="flex items-center gap-1">
            <Users size={12} weight="bold" />
            Akusara Digital
          </span>
        </div>
      </section>

      {/* Right panel - Auth Form */}
      <section className="flex-1 bg-white flex flex-col justify-between p-6 sm:p-12 lg:p-16 text-slate-900 min-h-screen md:min-h-0">
        {/* Navigation & Access Info */}
        <div className="flex items-center justify-between gap-4 text-xs font-semibold tracking-wider text-slate-500 mb-8 md:mb-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>{t.common.backToHome}</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 border border-slate-100 bg-slate-50/50 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
            <ShieldCheck size={14} weight="bold" className="text-blue-600" />
            {t.login.workspaceAccess}
          </span>
        </div>

        {/* Form Container */}
        <div className="my-auto max-w-md w-full mx-auto py-8">
          <div className="mb-8">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              {mode === "signup"
                ? t.login.tagCreateAccount
                : mode === "forgot"
                  ? t.login.tagPasswordRecovery
                  : mode === "verify-otp"
                    ? t.login.tagVerifyEmail
                    : mode === "verify-mfa"
                      ? t.login.tagTwoFactor
                      : t.login.tagWelcomeBack}
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {mode === "signup"
                ? t.login.titleSignup
                : mode === "forgot"
                  ? t.login.titleForgot
                  : mode === "verify-otp"
                    ? t.login.titleVerifyOtp
                    : mode === "verify-mfa"
                      ? t.login.titleVerifyMfa
                      : t.login.titleSignin}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
              {mode === "signup"
                ? t.login.subtitleSignup
                : mode === "forgot"
                  ? t.login.subtitleForgot
                  : mode === "verify-otp"
                    ? interpolate(t.login.subtitleVerifyOtp, { email: verifyEmail })
                    : mode === "verify-mfa"
                      ? t.login.subtitleVerifyMfa
                      : t.login.subtitleSignin}
            </p>
          </div>

          {/* Form wrapper */}
          <div className="border border-slate-100 bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-8">
            {mode === "verify-otp" ? (
              <OtpVerifyForm
                email={verifyEmail}
                onVerified={() => {
                  setShowSuccessModal(true);
                  handleModeChange("signin");
                }}
                onBack={() => handleModeChange("signin")}
              />
            ) : mode === "verify-mfa" ? (
              <form noValidate onSubmit={handleMfaSubmit} className="space-y-5">
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <ShieldCheck size={40} weight="duotone" className="text-blue-600 mb-2" />
                  <p className="text-xs text-slate-600 text-center font-medium">
                    {t.login.subtitleVerifyMfa}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block text-center">
                    {t.otp.verificationCode}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={mfaTotpCode}
                    onChange={(e) => setMfaTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full h-12 text-center font-mono text-2xl font-bold tracking-[0.4em] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                {error && <InlineAlert variant="error" message={error} compact className="px-1" />}

                <button
                  type="submit"
                  disabled={pending || mfaTotpCode.length !== 6}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 text-sm font-semibold transition-all shadow-md shadow-blue-500/15 disabled:opacity-50"
                >
                  <span>{pending ? t.otp.verifying : t.otp.verify}</span>
                  {!pending && <ArrowRight size={16} weight="bold" />}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaTempToken("");
                      setMfaTotpCode("");
                      handleModeChange("signin");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium"
                  >
                    <ArrowLeft size={12} weight="bold" />
                    <span>{t.common.backToSignIn}</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
            {mode !== "forgot" && (
              <div>
                <GoogleSignInButton inviteToken={inviteToken} />
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{t.login.orUseEmail}</span>
                  <span className="h-px flex-1 bg-slate-100" />
                </div>
              </div>
            )}

            <form noValidate onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.login.fullName}</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className={inputClass}
                  />
                  <FormFieldError message={fieldErrors.name} className="px-1" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.login.emailAddress}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@company.com"
                  className={inputClass}
                />
                <FormFieldError message={fieldErrors.email} className="px-1" />
              </div>

              {mode !== "forgot" && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.login.password}</label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => handleModeChange("forgot")}
                          className="text-[10px] font-bold uppercase tracking-wider text-blue-600 transition hover:text-blue-700"
                        >
                          {t.login.forgotPassword}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className={`${inputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-slate-400 transition hover:text-slate-700"
                        aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                      >
                        {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                      </button>
                    </div>
                    <FormFieldError message={fieldErrors.password} className="px-1" />
                  </div>

                  {mode === "signin" && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="rememberMe" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                        {t.login.rememberMe}
                      </label>
                    </div>
                  )}

                  {mode === "signup" && (
                    <>
                      {inviteToken ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.login.jobRole}</label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className={selectClass}
                          >
                            <option value="">{t.login.selectYourRole}</option>
                            {getPublicRoleOptions().map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <FormFieldError message={fieldErrors.role} className="px-1" />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.login.workspaceCompanyName}</label>
                          <input
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleInputChange}
                            placeholder="e.g. Acme Corp"
                            className={inputClass}
                          />
                          <FormFieldError message={fieldErrors.company} className="px-1" />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {mode === "signup" && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-action="turnstile-spin-v1" />
              )}

              {error && <InlineAlert variant="error" message={error} compact className="px-1" />}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-5 py-3 text-sm font-semibold transition-all shadow-md shadow-blue-500/15 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                  <span>
                    {pending
                      ? t.login.processing
                      : mode === "signup"
                        ? t.login.signUp
                        : mode === "forgot"
                          ? t.login.sendResetLink
                          : t.login.signIn}
                  </span>
                  {!pending && <ArrowRight size={16} weight="bold" />}
                </button>
              </div>

              {mode !== "forgot" ? (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange(mode === "signin" ? "signup" : "signin")}
                    className="text-xs text-slate-500 transition hover:text-blue-600"
                  >
                    {mode === "signin" ? (
                      <span>{t.login.noAccountPrefix} <strong className="text-blue-600">{t.login.signUpHere}</strong></span>
                    ) : (
                      <span>{t.login.haveAccountPrefix} <strong className="text-blue-600">{t.login.signInHere}</strong></span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange("signin")}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600"
                  >
                    <ArrowLeft size={12} weight="bold" />
                    <span>{t.common.backToSignIn}</span>
                  </button>
                </div>
              )}
            </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="md:hidden text-center text-xs text-slate-400 border-t border-slate-100 pt-6">
          &copy; {new Date().getFullYear()} Aksora. {t.login.footerBuiltBy}
        </div>
      </section>

      <ConfirmModal
        isOpen={showSuccessModal}
        title={t.login.registrationSuccessTitle}
        message={t.login.registrationSuccessMessage}
        confirmText={t.login.signInNow}
        cancelText={t.login.close}
        type="info"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-3xl font-black tracking-tighter text-blue-600">
          Aksora
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
