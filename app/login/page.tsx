"use client";

import { Suspense, type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeSlash, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FormFieldError } from "@/components/shared/form-field-error";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getPublicRoleOptions } from "@/lib/roles";
import { GoogleSignInButton } from "@/components/oauth/google-signin-button";

const inputClass =
  "w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none";
const selectClass =
  "w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const inviteToken = searchParams.get("inviteToken") || "";
  const initialMode = searchParams.get("mode");

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(() =>
    initialMode === "signup" || initialMode === "forgot" ? initialMode : "signin"
  );
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-10 lg:py-14">
        <div className="mb-6 flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 transition hover:text-slate-950">
            <ArrowLeft size={12} weight="bold" />
            Back to homepage
          </Link>
          <span className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5">
            <ShieldCheck size={14} weight="bold" className="text-blue-600" />
            Workspace access
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <section className="border border-slate-200 bg-white p-6 lg:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-600">
              {mode === "signup" ? "Create account" : mode === "forgot" ? "Recover access" : "Sign in"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {mode === "signup" ? "Create your workspace account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
              {mode === "signup"
                ? "Create an account for the team member who needs access."
                : mode === "forgot"
                  ? "Enter your email and we will send a reset link if the account exists."
                  : "Use Google or email to enter your workspace."}
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-4">
                <Check size={16} weight="bold" className="mt-0.5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">Google sign-in</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Use the button below if your account already exists.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-4">
                <Check size={16} weight="bold" className="mt-0.5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">Email sign-in</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">The form supports sign in, sign up, and password reset in one place.</p>
                </div>
              </div>
            </div>

            {mode !== "forgot" && (
              <button
                type="button"
                onClick={() => handleModeChange(mode === "signin" ? "signup" : "signin")}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
              >
                <ArrowRight size={14} weight="bold" className={mode === "signin" ? "rotate-0" : "rotate-180"} />
                <span>{mode === "signin" ? "Switch to create account" : "Use sign in"}</span>
              </button>
            )}
          </section>

          <section className="border border-slate-200 bg-white p-6 lg:p-8">
            {mode !== "forgot" && (
              <div className="border border-slate-200 bg-slate-50 p-4">
                <GoogleSignInButton inviteToken={inviteToken} />
                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">or use email</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1">
                    <Check size={12} weight="bold" className="text-emerald-600" />
                    Google
                  </span>
                  <span className="inline-flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1">
                    <Check size={12} weight="bold" className="text-emerald-600" />
                    Email
                  </span>
                </div>
              </div>
            )}

            <form noValidate onSubmit={submit} className="mt-6 space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Full Name</label>
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

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Email Address</label>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Password</label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => handleModeChange("forgot")}
                          className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-600 transition hover:text-blue-700"
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
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Software Role</label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          className={selectClass}
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

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Company Name</label>
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
                    </>
                  )}
                </>
              )}

              {error && <InlineAlert variant="error" message={error} compact className="px-1" />}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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

                <p className="text-xs leading-5 text-slate-500">
                  {mode === "signup"
                    ? "Creating an account without an invite sets up your own new workspace."
                    : "Google sign-in and email sign-in share the same form."}
                </p>
              </div>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => handleModeChange("signin")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                >
                  <ArrowLeft size={14} weight="bold" />
                  <span>Back to sign in</span>
                </button>
              )}
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              <span>Aksora</span>
            </div>
          </section>
        </div>
      </main>

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
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-3xl font-black tracking-tighter text-blue-600">
          Aksora
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
