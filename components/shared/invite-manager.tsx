"use client";

import { useEffect, useState } from"react";
import { CaretDown, Plus, Trash, Warning } from"@phosphor-icons/react";
import { toast } from"@/components/ui/toast";
import { getInviteRoleOptions, getRoleLabel } from"@/lib/roles";
import { cn } from"@/lib/utils";

type Invite = {
 token: string;
 workspace: string;
 role: string;
 status: string;
 expiresAt: string;
 createdAt: string;
};

type WorkspaceOption = {
 id: number;
 name: string;
 role: string;
};

type AuthMeMembership = {
  workspaceId: number;
  name: string;
  role: string;
};

export function InviteManager({ embedded = false, compact = false }: { embedded?: boolean; compact?: boolean } = {}) {
 const [role, setRole] = useState("");
 const [expiresInDays, setExpiresInDays] = useState("");
 const [invites, setInvites] = useState<Invite[]>([]);
 const [loading, setLoading] = useState(false);
 const [showInviteForm, setShowInviteForm] = useState(!embedded);
 const [limitModal, setLimitModal] = useState<{ current: number; max: number; plan: string } | null>(null);
 const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
 const [workspaceId, setWorkspaceId] = useState<string>("");

 const loadInvites = async () => {
 const res = await fetch("/api/invites");
 const data = await res.json().catch(() => null);
 setInvites(Array.isArray(data?.invites) ? data.invites : []);
 };

 useEffect(() => {
   void loadInvites();
   fetch("/api/auth/me")
     .then((r) => r.json())
     .then((data) => {
       const memberships = Array.isArray(data?.user?.memberships) ? (data.user.memberships as AuthMeMembership[]) : [];
       setWorkspaces(memberships.map((m) => ({ id: Number(m.workspaceId), name: m.name, role: String(m.role || "") })));
       const active = Number(data?.user?.activeWorkspaceId || memberships[0]?.workspaceId || 0);
       if (active) setWorkspaceId(String(active));
     })
     .catch(() => {});
 }, []);

 const createInvite = async () => {
 setLoading(true);
 try {
 const res = await fetch("/api/invites", {
  method:"POST",
  headers: {"Content-Type":"application/json" },
  body: JSON.stringify({
   role,
   expiresInDays: Number(expiresInDays) || 7,
   workspaceId: workspaceId ? Number(workspaceId) : undefined,
  }),
 });

 const data = await res.json().catch(() => null);
 if (!res.ok) {
 if (data?.error === "USER_LIMIT_REACHED") {
 setLimitModal({ current: data.current, max: data.max, plan: data.plan });
 return;
 }
 throw new Error(data?.error ||"Failed to create invite");
 }
 toast("Invite link generated","success");
 await loadInvites();
 } catch (err) {
 toast(err instanceof Error ? err.message :"Failed to create invite","error");
 } finally {
 setLoading(false);
 }
 };

 const revoke = async (token: string) => {
 try {
 const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, { method:"DELETE" });
 if (!res.ok) {
 const data = await res.json().catch(() => null);
 throw new Error(data?.error ||"Failed to revoke invite");
 }
 setInvites((prev) => prev.filter((invite) => invite.token !== token));
 toast("Invite revoked","success");
 } catch (err) {
 toast(err instanceof Error ? err.message :"Failed to revoke invite","error");
 }
 };

 const copyInviteLink = async (token: string) => {
 try {
 await navigator.clipboard.writeText(`${window.location.origin}/login?mode=signup&inviteToken=${token}`);
 toast("Invite link copied","success");
 } catch {
 toast("Copy failed","error");
 }
 };

 const content = (
 <>
 {/* Upgrade Plan Modal */}
 {limitModal && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 animate-in fade-in duration-150">
 <div className="w-full max-w-md border border-gray-200 bg-white p-6 shadow-xl mx-4">
 <div className="flex items-center gap-3 mb-4">
 <div className="flex h-10 w-10 items-center justify-center bg-amber-100 text-amber-600">
 <Warning size={20} weight="bold" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-gray-900">User Limit Reached</h3>
 <p className="text-xs text-gray-500">Your workspace has reached its maximum capacity.</p>
 </div>
 </div>
 <div className="border border-amber-100 bg-amber-50 px-4 py-3 mb-4">
 <div className="flex items-center justify-between text-sm">
 <span className="text-gray-700">Current users</span>
 <span className="font-bold text-gray-900">{limitModal.current} / {limitModal.max}</span>
 </div>
 <div className="flex items-center justify-between text-sm mt-1">
 <span className="text-gray-700">Current plan</span>
 <span className="font-bold text-gray-900 capitalize">{limitModal.plan}</span>
 </div>
 </div>
 <div className="space-y-2 mb-5">
 <p className="text-xs font-semibold text-gray-700">Upgrade options:</p>
 <div className="grid grid-cols-2 gap-2">
 {limitModal.plan === "free" && (
 <div className="border border-blue-200 bg-blue-50 px-3 py-2">
 <p className="text-xs font-bold text-blue-700">Pro Plan</p>
 <p className="text-[11px] text-blue-600">Up to 25 users</p>
 <p className="text-[10px] text-blue-500 mt-0.5">Rp 490.000/month</p>
 </div>
 )}
 <div className="border border-violet-200 bg-violet-50 px-3 py-2">
 <p className="text-xs font-bold text-violet-700">Enterprise</p>
 <p className="text-[11px] text-violet-600">Up to 100 users</p>
 <p className="text-[10px] text-violet-500 mt-0.5">Rp 1.490.000/month</p>
 </div>
 </div>
 </div>
 <div className="flex gap-2">
 <button onClick={() => setLimitModal(null)}
 className="flex-1 h-9 border border-gray-200 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
 Close
 </button>
 <a href="mailto:admin@akusaradigital.com?subject=Upgrade Plan Request"
 className="flex-1 flex h-9 items-center justify-center bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-700">
 Contact to Upgrade
 </a>
 </div>
 </div>
 </div>
 )}

 <div className={compact ?"flex items-center justify-end gap-2" : embedded ?"flex items-center justify-end gap-2" :"flex flex-wrap items-center justify-between gap-3"}>
 {!embedded && !compact ? (
 <div>
 <h2 className="text-xl font-bold text-gray-900">Invite users</h2>
 <p className="mt-1 text-sm text-gray-500">Share a link to add teammates to your workspace. Their role is set by you.</p>
 </div>
 ) : null}
 <button
 type="button"
 onClick={() => setShowInviteForm((prev) => !prev)}
 className={cn(
"inline-flex h-11 items-center justify-center gap-2  border px-5 text-sm font-bold transition-colors",
 showInviteForm
 ?"border-emerald-500 bg-emerald-500 text-white"
 :"border-gray-200 bg-white text-gray-700 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white",
 )}
 >
 <Plus size={16} weight="bold" />
 Invite User
 </button>
 </div>

 {!compact && showInviteForm && (
 <div className={embedded ?"mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_104px_150px_120px]" :"mt-5 grid gap-2 md:grid-cols-[minmax(0,1fr)_104px_150px_120px]"}>
<div className="relative min-w-0">
 <select
  value={workspaceId}
  onChange={(e) => setWorkspaceId(e.target.value)}
  className="h-11 w-full appearance-none border border-gray-200 bg-white px-3 pr-10 text-sm outline-none"
 >
  <option value="" disabled hidden>
   Select workspace
  </option>
  {workspaces.map((workspace) => (
   <option key={workspace.id} value={workspace.id}>
    {workspace.name}
   </option>
  ))}
 </select>
 <CaretDown size={14} weight="bold" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
</div>
<div className="relative min-w-0">
 <select
  value={role}
  onChange={(e) => setRole(e.target.value)}
  className="h-11 w-full appearance-none  border border-gray-200 bg-white px-3 pr-10 text-sm outline-none"
 >

 <option value="" disabled hidden>
 Select a role
 </option>
 {getInviteRoleOptions().map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 <CaretDown size={14} weight="bold" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
 </div>
 <input
 value={expiresInDays}
 onChange={(e) => setExpiresInDays(e.target.value)}
 type="number"
 min="1"
 max="30"
 placeholder="Days"
 className="h-11 w-full  border border-gray-200 bg-white px-3 text-sm outline-none"
 />
 <button
 onClick={createInvite}
 disabled={loading || !role}
 className="inline-flex h-11 items-center justify-center gap-2  bg-gray-900 px-4 text-sm font-bold text-white disabled:opacity-60"
 >
 <Plus size={16} weight="bold" />
 {loading ?"Creating..." :"Generate"}
 </button>
 <button
 onClick={() => void loadInvites()}
 className="inline-flex h-11 items-center justify-center  border border-gray-200 px-4 text-sm font-bold text-gray-600"
 >
 Refresh
 </button>
 </div>
 )}

 {invites.length > 0 && (
 <div className="mt-6">
 <h3 className="text-xs font-bold uppercase tracking-[0.28em] text-gray-400">Pending invites</h3>
 <div className="mt-3 space-y-2">
 {invites.map((invite) => (
 <div key={invite.token} className="flex flex-col gap-3  border border-gray-200 p-3 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="text-sm font-bold text-gray-900">{getRoleLabel(invite.role)}</p>
 <p className="text-xs text-gray-500">{invite.status} · expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
 </div>
 <div className="flex flex-wrap gap-2 md:justify-end">
 <button onClick={() => void copyInviteLink(invite.token)} className=" border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600">Copy</button>
 <button onClick={() => void revoke(invite.token)} className="inline-flex items-center gap-2  bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
 <Trash size={14} weight="bold" />
 Revoke
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </>
 );

 return embedded ? (
 <div>{content}</div>
 ) : (
 <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
 {content}
 </section>
 );
}
