"use client";

import { useEffect, useState } from "react";
import {
  Users,
  X,
  Plus,
  Trash,
  Link as LinkIcon,
  Copy,
  Check,
  UserPlus,
} from "@phosphor-icons/react";
import { getInviteRoleOptions, getRoleLabel } from "@/lib/roles";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectMember {
  id: number;
  uuid: string;
  projectId: number;
  userId: number;
  role: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
}

interface PendingInvite {
  token: string;
  role: string;
  createdBy: string;
  expiresAt: string;
  createdAt: string;
}

interface ProjectMembersModalProps {
  project: { id: number; name: string; key?: string } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectMembersModal({ project, isOpen, onClose }: ProjectMembersModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  // Invite form state
  const [inviteRole, setInviteRole] = useState("qa");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Existing workspace users
  const [workspaceUsers, setWorkspaceUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addRole, setAddRole] = useState("qa");
  const [addingUser, setAddingUser] = useState(false);

  const loadData = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/members`);
      if (!res.ok) throw new Error("Failed to load project members");
      const json = await res.json();
      setMembers(json.data?.members || []);
      setPendingInvites(json.data?.pendingInvites || []);
      setCanManage(Boolean(json.data?.canManageMembers));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error loading members", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        setWorkspaceUsers(json.data || json.users || []);
      }
    } catch {
      /* non-critical */
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      void loadData();
      void loadWorkspaceUsers();
      setGeneratedLink("");
      setCopied(false);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleAddExistingUser = async () => {
    if (!selectedUserId) {
      toast("Please select a user to add", "error");
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          role: addRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user");
      toast(data.message || "User added to project", "success");
      setSelectedUserId("");
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add user", "error");
    } finally {
      setAddingUser(false);
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: inviteRole,
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate invite");
      setGeneratedLink(data.link || "");
      toast("Invite link generated for project", "success");
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create invite", "error");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleRoleChange = async (userId: number, nextRole: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update role");
      }
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: nextRole } : m)),
      );
      toast("Member role updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  const handleRemoveMember = async (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from ${project.name}?`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to remove member");
      }
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast("Member removed from project", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove member", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast("Link copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Members & Access</h2>
              <p className="text-xs text-slate-500">
                {project.name} {project.key ? `[${project.key}]` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick invite link generator */}
          {canManage && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <UserPlus size={16} weight="bold" className="text-blue-600" />
                Invite User Directly into this Project
              </div>
              <p className="text-xs text-slate-600">
                Generate an invite link with a pre-assigned role for this project. When they sign up, they are automatically granted access.
              </p>

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-xs outline-none focus:border-blue-500"
                >
                  {getInviteRoleOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Role: {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-xs outline-none focus:border-blue-500"
                >
                  <option value={1}>Expires in 1 day</option>
                  <option value={7}>Expires in 7 days</option>
                  <option value={14}>Expires in 14 days</option>
                  <option value={30}>Expires in 30 days</option>
                </select>

                <button
                  type="button"
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60"
                >
                  <LinkIcon size={14} weight="bold" />
                  {generatingInvite ? "Generating..." : "Create Invite Link"}
                </button>
              </div>

              {generatedLink && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white p-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-transparent text-xs text-slate-700 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedLink)}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                  >
                    {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Add existing workspace user */}
          {canManage && workspaceUsers.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="text-xs font-bold text-slate-800">Add Existing Workspace Member to Project</div>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-9 min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-xs outline-none focus:border-blue-500"
                >
                  <option value="">Select team member...</option>
                  {workspaceUsers
                    .filter((u) => !members.some((m) => m.userId === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email} ({u.email})
                      </option>
                    ))}
                </select>

                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-xs outline-none focus:border-blue-500"
                >
                  {getInviteRoleOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Role: {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddExistingUser}
                  disabled={addingUser || !selectedUserId}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <Plus size={14} weight="bold" />
                  {addingUser ? "Adding..." : "Add to Project"}
                </button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Project Members ({members.length})
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                No specific project members assigned yet. By default, workspace administrators and team members have general workspace visibility.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs uppercase">
                        {member.name ? member.name.charAt(0) : "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canManage ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-xs outline-none focus:border-blue-500"
                        >
                          <option value="admin">Admin</option>
                          {getInviteRoleOptions().map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {getRoleLabel(member.role)}
                        </span>
                      )}

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.userId, member.name)}
                          title="Remove from project"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash size={14} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Pending Invites for this Project ({pendingInvites.length})
              </h3>
              <div className="space-y-2">
                {pendingInvites.map((inv) => (
                  <div key={inv.token} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">Role: {getRoleLabel(inv.role)}</span>
                      <p className="text-[11px] text-slate-400">Created by {inv.createdBy || "Admin"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${window.location.origin}/login?mode=signup&inviteToken=${inv.token}`)}
                      className="inline-flex h-7 items-center gap-1 rounded bg-white border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Copy size={12} weight="bold" />
                      Copy Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
