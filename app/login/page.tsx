"use client";

import { Suspense, type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
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

const inputClass =
  "w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none";
const selectClass =
  "w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const inviteToken = searchParams.get("inviteToken") || "";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    company: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      requireField("name", "Name is required.");
      requireField("email", "Email address is required.");
      requireField("password", "Password is required.");
      requireField("role", "Role is required.");
      requireField("company", "Company name is required.");
    } else if (mode === "forgot") {
      requireField("email", "Email address is required.");
    } else {
      requireField("email", "Email address is required.");
      requireField("password", "Password is required.");
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
      setTimeout(() => {
        toast("If an account exists with that email, a reset link has been sent.", "info");
        setPending(false);
        handleModeChange("signin");
      }, 1000);
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
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : { error: await res.text() };

      if (!res.ok) throw new Error(data.error || "Authentication failed");

      if (mode === "signup") {
        setShowSuccessModal(true);
        setFormData({ name: "", email: "", password: "", role: "", company: "" });
        handleModeChange("signin");
        return;
      }

      const isPlatformSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
      router.push(isPlatformSuperAdmin ? "/admin/overview" : nextUrl);
      router.refresh();
      toast("Welcome back!", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Left panel - Visual Branding & Interactive Look */}
      <section className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex-col justify-between p-12 lg:p-16 border-r border-slate-800/50">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Ambient glow blobs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl" />

        {/* Logo and Brand */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-xl">
            A
          </div>
          <span className="text-xl font-bold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white to-slate-300">
            Aksora
          </span>
        </div>

        {/* Value Proposition & Visual Mockup */}
        <div className="relative my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs font-semibold tracking-wider text-blue-400 uppercase mb-6">
            <Sparkle size={12} weight="fill" />
            Enterprise QA Workspace
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white max-w-lg">
            One Team. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
              One Unified Flow.
            </span>
          </h2>
          <p className="mt-4 text-slate-400 text-base max-w-md leading-relaxed">
            Sederhanakan manajemen pengujian tim Anda. Hubungkan perencanaan test case, eksekusi sprint, standup harian, dan pelaporan bug dalam satu workspace terintegrasi.
          </p>

          {/* Premium CSS-based UI mockup */}
          <div className="mt-12 max-w-md rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 backdrop-blur-md shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">Aksora Dashboard v0.12.0</span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Checks size={16} weight="bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Execution Run #182</p>
                    <p className="text-[10px] text-slate-500">Workspace: QA-Daily-Hub</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">Passed</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                    <Bug size={16} weight="bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Bug #401: Auth token crash</p>
                    <p className="text-[10px] text-slate-500">Reported by PM Admin</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">High</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <ChartLine size={16} weight="bold" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Active Sprint 12</p>
                    <p className="text-[10px] text-slate-500">Sprint Goal: Core APIs stability</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/40 pt-6">
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
            <span>Kembali ke Beranda</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 border border-slate-100 bg-slate-50/50 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
            <ShieldCheck size={14} weight="bold" className="text-blue-600" />
            Workspace access
          </span>
        </div>

        {/* Form Container */}
        <div className="my-auto max-w-md w-full mx-auto py-8">
          <div className="mb-8">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              {mode === "signup" ? "Create Account" : mode === "forgot" ? "Password Recovery" : "Welcome Back"}
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {mode === "signup"
                ? "Daftar Akun Baru"
                : mode === "forgot"
                  ? "Atur Ulang Sandi"
                  : "Masuk ke Aksora"}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
              {mode === "signup"
                ? "Mulai berkolaborasi dengan tim dalam mengelola kualitas software."
                : mode === "forgot"
                  ? "Masukkan email Anda dan kami akan mengirimkan instruksi pemulihan."
                  : "Masuk dengan Google atau email untuk mengakses workspace Anda."}
            </p>
          </div>

          {/* Form wrapper */}
          <div className="border border-slate-100 bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-8">
            {mode !== "forgot" && (
              <div>
                <GoogleSignInButton inviteToken={inviteToken} />
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">atau gunakan email</span>
                  <span className="h-px flex-1 bg-slate-100" />
                </div>
              </div>
            )}

            <form noValidate onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Lengkap</label>
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alamat Email</label>
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
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kata Sandi</label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => handleModeChange("forgot")}
                          className="text-[10px] font-bold uppercase tracking-wider text-blue-600 transition hover:text-blue-700"
                        >
                          Lupa sandi?
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
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                      </button>
                    </div>
                    <FormFieldError message={fieldErrors.password} className="px-1" />
                  </div>

                  {mode === "signup" && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peran Pekerjaan</label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          className={selectClass}
                        >
                          <option value="">Pilih peran Anda</option>
                          {getPublicRoleOptions().map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <FormFieldError message={fieldErrors.role} className="px-1" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Workspace / Perusahaan</label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          placeholder="Contoh: Acme Corp"
                          className={inputClass}
                        />
                        <FormFieldError message={fieldErrors.company} className="px-1" />
                      </div>
                    </>
                  )}
                </>
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
                      ? "Memproses..."
                      : mode === "signup"
                        ? "Daftar Sekarang"
                        : mode === "forgot"
                          ? "Kirim Link Atur Ulang"
                          : "Masuk"}
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
                      <span>Belum punya akun? <strong className="text-blue-600">Daftar di sini</strong></span>
                    ) : (
                      <span>Sudah memiliki akun? <strong className="text-blue-600">Masuk di sini</strong></span>
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
                    <span>Kembali ke halaman masuk</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="md:hidden text-center text-xs text-slate-400 border-t border-slate-100 pt-6">
          &copy; {new Date().getFullYear()} Aksora. Built by Akusara Digital.
        </div>
      </section>

      <ConfirmModal
        isOpen={showSuccessModal}
        title="Pendaftaran Berhasil"
        message="Akun Anda berhasil dibuat. Silakan masuk menggunakan email dan kata sandi Anda."
        confirmText="Masuk Sekarang"
        cancelText="Tutup"
        type="info"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-3xl font-black tracking-tighter text-blue-500">
          Aksora
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
