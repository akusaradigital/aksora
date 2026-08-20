"use client";

import React, { useEffect, useState } from "react";
import { EnvelopeSimple, Briefcase, User, CheckCircle, Warning, ShieldCheck, LockKey, QrCode, Copy, Check, Globe } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { FormFieldError } from "@/components/shared/form-field-error";
import { getRoleLabel } from "@/lib/roles";
import { useTranslation } from "@/hooks/use-translation";

interface UserProfile {
 id: number;
 name: string;
 email: string;
 role: string;
 locale?: string;
 mfaEnabled?: boolean;
}

export function ProfileForm({ user }: { user: UserProfile }) {
 const [loading, setLoading] = useState(false);
 const router = useRouter();
 const { locale: currentLocale, setLocale } = useTranslation();
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
 const [mfaEnabled, setMfaEnabled] = useState(Boolean(user.mfaEnabled));
 const [mfaLoading, setMfaLoading] = useState(false);
 const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; uri: string } | null>(null);
 const [mfaCode, setMfaCode] = useState("");
 const [showMfaModal, setShowMfaModal] = useState(false);
 const [showDisableModal, setShowDisableModal] = useState(false);
 const [disableMfaCode, setDisableMfaCode] = useState("");
 const handleInitiateMfa = async () => {
   setMfaLoading(true);
   try {
     const res = await fetch("/api/settings/mfa", { method: "POST" });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || "Failed to initialize MFA");
     setMfaSetupData(data);
     setMfaCode("");
     setShowMfaModal(true);
   } catch (err: any) {
     toast(err.message || "Failed to start 2FA setup", "error");
   } finally {
     setMfaLoading(false);
   }
 };

 const handleConfirmMfa = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!mfaCode || mfaCode.length !== 6) {
     toast("Please enter the 6-digit code from your authenticator app", "error");
     return;
   }
   setMfaLoading(true);
   try {
     const res = await fetch("/api/settings/mfa", {
       method: "PATCH",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ code: mfaCode }),
     });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || "Invalid verification code");
     setMfaEnabled(true);
     setShowMfaModal(false);
     setMfaSetupData(null);
     toast("Two-factor authentication enabled successfully!", "success");
     router.refresh();
   } catch (err: any) {
     toast(err.message || "Verification failed", "error");
   } finally {
     setMfaLoading(false);
   }
 };

 const handleDisableMfa = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!disableMfaCode || disableMfaCode.length !== 6) {
     toast("Please enter your current 6-digit TOTP code to confirm", "error");
     return;
   }
   setMfaLoading(true);
   try {
     const res = await fetch("/api/settings/mfa", {
       method: "DELETE",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ code: disableMfaCode }),
     });
     const data = await res.json();
     if (!res.ok) throw new Error(data.error || "Failed to disable 2FA");
     setMfaEnabled(false);
     setShowDisableModal(false);
     setDisableMfaCode("");
     toast("Two-factor authentication disabled", "info");
     router.refresh();
   } catch (err: any) {
     toast(err.message || "Failed to disable 2FA", "error");
   } finally {
     setMfaLoading(false);
   }
 };
 const [formData, setFormData] = useState({
 name: user.name ||"",
 role: user.role ||"",
 locale: (user.locale as "en" | "id") || currentLocale || "en",
 password:"",
 confirmPassword:"",
 });

 useEffect(() => {
 setFormData({
 name: user.name ||"",
 role: user.role ||"",
 locale: (user.locale as "en" | "id") || currentLocale || "en",
 password:"",
 confirmPassword:"",
 });
 }, [user.name, user.role, user.locale, currentLocale]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 const nextErrors: Record<string, string> = {};
 if (!formData.name.trim()) nextErrors.name = "Name is required.";

 if (formData.password && formData.password.length < 6) {
 nextErrors.password = "Password must be at least 6 characters.";
 }

 if (formData.password && formData.password !== formData.confirmPassword) {
 nextErrors.confirmPassword = "Passwords do not match.";
 }

 if (Object.keys(nextErrors).length > 0) {
 setFieldErrors(nextErrors);
 toast("Please fix the highlighted fields.","error");
 return;
 }

 setFieldErrors({});

 setLoading(true);

 try {
 const res = await fetch("/api/auth/profile", {
 method:"PATCH",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 name: formData.name,
 role: formData.role,
 locale: formData.locale,
 password: formData.password || undefined,
 }),
 });

 const data = await res.json();

 if (res.ok) {
 setLocale(formData.locale as "en" | "id");
 toast("Profile updated successfully","success");
 window.dispatchEvent(new Event("qa:profile-updated"));
 router.refresh();
 } else {
 toast(data.error ||"Failed to update profile","error");
 }
 } catch {
 toast("An error occurred. Please try again.","error");
 } finally {
 setLoading(false);
 }
 };

  return (
  <form noValidate onSubmit={handleSubmit} className="space-y-8">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 {/* Name Field */}
 <div className="space-y-2">
 <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
 <User size={12} weight="bold" /> Full Name
 </label>
  <input
  type="text"
  value={formData.name}
  onChange={(e) => {
  setFormData({ ...formData, name: e.target.value });
  setFieldErrors((current) => {
  const next = { ...current };
  delete next.name;
  return next;
  });
  }}
  className="w-full h-11 px-4  bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
  placeholder="e.g. John Doe"
  />
  <FormFieldError message={fieldErrors.name} />
 </div>

 {/* Role Field */}
 <div className="space-y-2">
 <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
 <Briefcase size={12} weight="bold" /> Role / Title
 </label>
 <input
 type="text"
 value={getRoleLabel(formData.role)}
 readOnly
 className="w-full h-11 px-4  bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
 placeholder="Role"
 />
 </div>

 {/* Email (Read-only as per request) */}
 <div className="space-y-2">
 <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
 <EnvelopeSimple size={12} weight="bold" /> Email Address
 </label>
 <div className="w-full h-11 px-4  bg-gray-100 border border-gray-200 flex items-center text-sm font-bold text-gray-500 opacity-70 cursor-not-allowed justify-between">
 {user.email ||"No email linked"}
 <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-200 text-[8px] font-bold uppercase tracking-wider text-gray-500">
 <Warning size={10} weight="bold" /> Locked
 </div>
 </div>
 </div>

 {/* Language Preference */}
 <div className="space-y-2">
 <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
 <Globe size={12} weight="bold" /> Language Preference
 </label>
 <select
 value={formData.locale}
 onChange={(e) => setFormData({ ...formData, locale: e.target.value as "en" | "id" })}
 className="w-full h-11 px-4 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
 >
 <option value="en">English (US)</option>
 <option value="id">Bahasa Indonesia (ID)</option>
 </select>
 </div>
 </div>

 <div className="pt-8 border-t border-gray-100">
 <div className="mb-6">
 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
 <CheckCircle size={16} className="text-blue-500" weight="bold" /> Security Update
 </h3>
<p className="text-xs text-gray-500 mt-1">Leave password fields empty if you don&apos;t want to change it.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
 <div className="space-y-2">
 <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">New Password</label>
  <input
  type="password"
  value={formData.password}
  onChange={(e) => {
  setFormData({ ...formData, password: e.target.value });
  setFieldErrors((current) => {
  const next = { ...current };
  delete next.password;
  delete next.confirmPassword;
  return next;
  });
  }}
  className="w-full h-11 px-4  bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
  placeholder="••••••••"
  />
  <FormFieldError message={fieldErrors.password} />
 </div>
 <div className="space-y-2">
 <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Confirm New Password</label>
  <input
  type="password"
  value={formData.confirmPassword}
  onChange={(e) => {
  setFormData({ ...formData, confirmPassword: e.target.value });
  setFieldErrors((current) => {
  const next = { ...current };
  delete next.confirmPassword;
  return next;
  });
  }}
  className="w-full h-11 px-4  bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm font-bold text-gray-800"
  placeholder="••••••••"
  />
  <FormFieldError message={fieldErrors.confirmPassword} />
 </div>
 </div>
 </div>

     <div className="pt-4 flex items-center justify-between">
       <button
         type="submit"
         disabled={loading}
         className="h-11 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 transition flex items-center gap-2 rounded-lg"
       >
         {loading ? "Updating..." : "Save Changes"}
       </button>
     </div>

     {/* Two-Factor Authentication Section */}
     <div className="pt-8 border-t border-gray-100">
       <div className="flex items-center justify-between mb-4">
         <div>
           <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
             <ShieldCheck size={16} className={mfaEnabled ? "text-emerald-500" : "text-gray-400"} weight="bold" />
             Two-Factor Authentication (2FA / TOTP)
           </h3>
           <p className="text-xs text-gray-500 mt-1">
             Protect your account by requiring a 6-digit TOTP code from Google Authenticator, 1Password, or Authy on login.
           </p>
         </div>
         {mfaEnabled ? (
           <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
             <Check size={12} weight="bold" /> Active
           </span>
         ) : (
           <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold">
             Disabled
           </span>
         )}
       </div>

       <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div className="flex items-center gap-3.5">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mfaEnabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-600"}`}>
             <LockKey size={20} weight="bold" />
           </div>
           <div>
             <p className="text-xs font-bold text-slate-900">
               {mfaEnabled ? "Authenticator App Configured" : "Authenticator App"}
             </p>
             <p className="text-[11px] text-slate-500">
               {mfaEnabled ? "Your account requires 6-digit code verification on sign-in." : "Use an app on your phone or browser to generate time-based codes."}
             </p>
           </div>
         </div>

         {mfaEnabled ? (
           <button
             type="button"
             onClick={() => setShowDisableModal(true)}
             className="px-4 py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-lg transition"
           >
             Disable 2FA
           </button>
         ) : (
           <button
             type="button"
             onClick={handleInitiateMfa}
             disabled={mfaLoading}
             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
           >
             <QrCode size={14} weight="bold" />
             <span>{mfaLoading ? "Loading..." : "Set Up 2FA"}</span>
           </button>
         )}
       </div>
     </div>

     {/* Enable MFA Modal */}
     {showMfaModal && mfaSetupData && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-900 animate-in fade-in zoom-in-95">
           <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
             <div className="flex items-center gap-2">
               <ShieldCheck size={20} weight="bold" className="text-blue-600" />
               <h3 className="text-sm font-bold text-slate-900">Set Up Two-Factor Authentication</h3>
             </div>
             <button
               type="button"
               onClick={() => setShowMfaModal(false)}
               className="text-slate-400 hover:text-slate-700 text-sm font-bold"
             >
               ✕
             </button>
           </div>

           <div className="space-y-4">
             <p className="text-xs text-slate-600 leading-relaxed">
               1. Scan the QR code or manually enter the key into your authenticator app (Google Authenticator, 1Password, Authy):
             </p>

             {/* Plain QR Code Rendering using QR API fallback or URI string */}
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaSetupData.uri)}`}
                 alt="2FA QR Code"
                 className="w-40 h-40 rounded-lg border border-slate-200 bg-white p-1"
               />
               <div className="mt-3 w-full">
                 <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                   <span>Secret Key (Manual Entry):</span>
                   <button
                     type="button"
                     onClick={() => {
                       navigator.clipboard.writeText(mfaSetupData.secret);
                       toast("Secret key copied", "success");
                     }}
                     className="text-blue-600 hover:underline flex items-center gap-0.5"
                   >
                     <Copy size={10} weight="bold" /> Copy
                   </button>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-center font-bold text-slate-800 tracking-wider select-all">
                   {mfaSetupData.secret}
                 </div>
               </div>
             </div>

             <form onSubmit={handleConfirmMfa} className="space-y-3 pt-2">
               <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                 2. Enter the 6-digit code to verify:
               </label>
               <input
                 type="text"
                 maxLength={6}
                 value={mfaCode}
                 onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                 placeholder="000000"
                 className="w-full h-11 text-center font-mono text-lg font-bold tracking-widest bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none"
               />
               <div className="flex items-center justify-end gap-2 pt-2">
                 <button
                   type="button"
                   onClick={() => setShowMfaModal(false)}
                   className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={mfaLoading || mfaCode.length !== 6}
                   className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                 >
                   {mfaLoading ? "Verifying..." : "Verify & Enable"}
                 </button>
               </div>
             </form>
           </div>
         </div>
       </div>
     )}

     {/* Disable MFA Modal */}
     {showDisableModal && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-slate-900">
           <h3 className="text-sm font-bold text-slate-900 mb-2">Disable Two-Factor Authentication</h3>
           <p className="text-xs text-slate-500 mb-4">
             Enter your current 6-digit authenticator code to confirm turning off 2FA.
           </p>
           <form onSubmit={handleDisableMfa} className="space-y-3">
             <input
               type="text"
               maxLength={6}
               value={disableMfaCode}
               onChange={(e) => setDisableMfaCode(e.target.value.replace(/\D/g, ""))}
               placeholder="000000"
               className="w-full h-11 text-center font-mono text-lg font-bold tracking-widest bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:outline-none"
             />
             <div className="flex items-center justify-end gap-2 pt-2">
               <button
                 type="button"
                 onClick={() => setShowDisableModal(false)}
                 className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
               >
                 Cancel
               </button>
               <button
                 type="submit"
                 disabled={mfaLoading || disableMfaCode.length !== 6}
                 className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
               >
                 {mfaLoading ? "Disabling..." : "Confirm Disable"}
               </button>
             </div>
           </form>
         </div>
       </div>
     )}
   </form>
 );
}
