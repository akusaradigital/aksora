"use client";

import React, { useEffect, useState } from"react";
import { EnvelopeSimple, Briefcase, User, CheckCircle, Warning } from"@phosphor-icons/react";
import { useRouter } from"next/navigation";
import { toast } from"@/components/ui/toast";
import { FormFieldError } from"@/components/shared/form-field-error";
import { getRoleLabel } from"@/lib/roles";

interface UserProfile {
 id: number;
 name: string;
 email: string;
 role: string;
}

export function ProfileForm({ user }: { user: UserProfile }) {
 const [loading, setLoading] = useState(false);
 const router = useRouter();
 const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
 const [formData, setFormData] = useState({
 name: user.name ||"",
 role: user.role ||"",
 password:"",
 confirmPassword:"",
 });

 useEffect(() => {
 setFormData({
 name: user.name ||"",
 role: user.role ||"",
 password:"",
 confirmPassword:"",
 });
 }, [user.name, user.role]);

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
 password: formData.password || undefined,
 }),
 });

 const data = await res.json();

 if (res.ok) {
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

 <div className="pt-4">
 <button
 type="submit"
 disabled={loading}
 className="h-11 px-8  bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
 >
 {loading ?"Updating..." :"Save Changes"}
 </button>
 </div>
 </form>
 );
}
