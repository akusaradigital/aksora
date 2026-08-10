"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FormFieldError } from "@/components/shared/form-field-error";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getPublicRoleOptions } from "@/lib/roles";
import { GoogleSignInButton } from "@/components/oauth/google-signin-button";

function LoginContent() {
  const router = useRouter();
  const [nextUrl, setNextUrl] = useState("/dashboard");
  const [inviteToken, setInviteToken] = useState("");

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

  useEffect(() => {
    setNextUrl(new URLSearchParams(window.location.search).get("next") || "/dashboard");
    setInviteToken(new URLSearchParams(window.location.search).get("inviteToken") || "");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[e.target.name];
      return next;
    });
    setError("");
  };

  const submit = async (event: React.FormEvent) => {
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
        setFieldErrors({});
        setMode("signin");
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
        setMode("signin");
        return;
      }

      // Superadmin goes directly to admin overview
      const isSuperAdmin = data.role === "superadmin" && !String(data.company || "").trim();
      const redirectTo = isSuperAdmin ? "/admin/overview" : nextUrl;

      router.push(redirectTo);
      router.refresh();
      toast("Welcome back!", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-slate-50 font-sans text-slate-900">
      <div className="hidden lg:flex w-1/2 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.16),transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)] p-12">
        <div className="relative z-10 max-w-md">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-sky-200">Aksora</p>
          <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-50 sm:text-6xl">
            Quality control, made sharp.
          </h1>
          <p className="mt-6 text-xl font-medium leading-relaxed text-slate-200">
            One Team. One Flow.
          </p>
        </div>
      </div>

      <div className="flex max-h-screen w-full items-center justify-center overflow-y-auto p-6 sm:p-8 md:p-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">
              {mode === "signup" ? "Create account" : mode === "forgot" ? "Recover access" : "Sign in"}
            </p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              {mode === "signup" ? "Get started now" : mode === "forgot" ? "Reset password" : "Welcome back"}
            </h2>
            <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
              {mode === "signup"
                ? "Set up your workspace account to get started."
                : mode === "forgot"
                ? "Enter your email and we'll send a password reset link."
                : "Sign in to access your Aksora workspace."}
            </p>
          </div>

          {mode !== "forgot" && (
            <div className="mb-6">
              <GoogleSignInButton inviteToken={inviteToken} />
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  or continue with email
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          )}

          <form noValidate onSubmit={submit} className="space-y-6">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm font-medium text-slate-900 outline-none appearance-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
                />
                <FormFieldError message={fieldErrors.name} className="px-1" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@company.com"
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm font-medium text-slate-900 outline-none appearance-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
                />
                <FormFieldError message={fieldErrors.email} className="px-1" />
              </div>

            {mode !== "forgot" && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Password</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setFieldErrors({});
                          setError("");
                          setMode("forgot");
                        }}
                        className="text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                      >
                        Forgot?
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
                      className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 pr-10 text-sm font-medium text-slate-900 outline-none appearance-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-blue-600"
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
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Software Role</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm font-medium text-slate-900 outline-none appearance-none transition-colors focus:border-blue-600 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
                      >
                        <option value="">Select your role</option>
                        {getPublicRoleOptions().map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <FormFieldError message={fieldErrors.role} className="px-1" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Company Name</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="e.g. Acme Corp"
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm font-medium text-slate-900 outline-none appearance-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
                      />
                      <FormFieldError message={fieldErrors.company} className="px-1" />
                    </div>
                  </>
                )}
              </>
            )}

            {error && <InlineAlert variant="error" message={error} compact className="px-1" />}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5 disabled:opacity-50"
            >
              <span>
                {pending
                  ? "Processing..."
                  : mode === "signup"
                  ? "Create Account"
                  : mode === "forgot"
                  ? "Send Reset Link"
                  : "Sign In"}
              </span>
              {!pending && <ArrowRight size={16} weight="bold" />}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setError("");
                  setMode("signin");
                }}
                className="flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
              >
                <ArrowLeft size={14} weight="bold" />
                <span>Back to sign in</span>
              </button>
            )}
          </form>

          {mode !== "forgot" && (
            <p className="mt-8 text-xs font-semibold text-slate-500">
              {mode === "signup"
                ? "Creating an account sets up your own workspace."
                : "Access is managed by your workspace administrator."}
            </p>
          )}

          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft size={12} weight="bold" />
            Back to homepage
          </Link>
        </div>
      </div>

      <ConfirmModal
        isOpen={showSuccessModal}
        title="Registration Successful"
        message="Your account has been created successfully. You can now sign in with your email and password."
        confirmText="Sign In Now"
        cancelText="Close"
        type="info"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />

      <footer className="absolute bottom-4 inset-x-0 text-center">
        <p className="text-[11px] font-medium text-slate-400">
          © 2026 — Aksora by <a href="https://akusaradigital.com" className="text-slate-500 hover:text-blue-600" target="_blank" rel="noopener noreferrer">Akusara Digital</a>
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 font-black text-3xl tracking-tighter text-blue-600">
          Aksora
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
