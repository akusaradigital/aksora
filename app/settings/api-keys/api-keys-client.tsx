"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Key,
  Plus,
  Trash,
  Copy,
  Check,
  Warning,
  X,
  Code,
  ShieldCheck,
  Clock,
  PencilSimpleLine,
  Eye,
  GitBranch,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineAlert } from "@/components/ui/inline-alert";

export type ApiKeyItem = {
  id: string | number;
  name: string;
  keyPrefix: string;
  workspaceId?: number | null;
  allowedModules?: string;
  scope?: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
};

const AVAILABLE_MODULES = [
  { key: "tasks", label: "Tasks" },
  { key: "bugs", label: "Bugs" },
  { key: "test-cases", label: "Test Cases" },
  { key: "test-plans", label: "Test Plans" },
  { key: "test-suites", label: "Test Suites" },
  { key: "test-sessions", label: "Test Sessions" },
  { key: "meeting-notes", label: "Meeting Notes" },
  { key: "sprints", label: "Sprints" },
  { key: "work-logs", label: "Work Logs" },
  { key: "deployments", label: "Deployments" },
] as const;

type WorkspaceOption = {
  id: number;
  name: string;
};

export function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresInDaysOption, setExpiresInDaysOption] = useState<string>("no_expiration");
  const [selectedModules, setSelectedModules] = useState<string[]>(["*"]);
  const [scope, setScope] = useState<"read" | "write">("write");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // One-time raw key reveal modal state
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedRawKey, setCopiedRawKey] = useState(false);

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Code snippet copy states
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/api-keys");
      if (!res.ok) {
        throw new Error("Failed to load API keys.");
      }
      const data = await res.json();
      setKeys(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        const wsList = (data.workspaces || []).map((w: { workspaceId?: number; id?: number; name: string }) => ({
          id: Number(w.workspaceId ?? w.id),
          name: w.name,
        }));
        setWorkspaces(wsList);
        if (wsList.length > 0 && !selectedWorkspaceId) {
          setSelectedWorkspaceId(String(wsList[0].id));
        }
      }
    } catch {
      // workspace fetch is optional
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchWorkspaces();
  }, []);

  const handleToggleModule = (moduleKey: string) => {
    if (selectedModules.includes("*")) {
      // Switching from all modules to specific selection
      const allKeys = AVAILABLE_MODULES.map((m) => m.key);
      setSelectedModules(allKeys.filter((k) => k !== moduleKey));
    } else if (selectedModules.includes(moduleKey)) {
      setSelectedModules(selectedModules.filter((k) => k !== moduleKey));
    } else {
      const updated = [...selectedModules, moduleKey];
      if (updated.length === AVAILABLE_MODULES.length) {
        setSelectedModules(["*"]);
      } else {
        setSelectedModules(updated);
      }
    }
  };

  const handleSelectAllModules = () => {
    setSelectedModules(["*"]);
  };

  const handleDeselectAllModules = () => {
    setSelectedModules([]);
  };

  const isModuleChecked = (moduleKey: string) => {
    return selectedModules.includes("*") || selectedModules.includes(moduleKey);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = keyName.trim();
    if (!name) return;

    let expiresInDays: number | null = null;
    if (expiresInDaysOption === "30") expiresInDays = 30;
    else if (expiresInDaysOption === "90") expiresInDays = 90;
    else if (expiresInDaysOption === "365") expiresInDays = 365;

    const workspaceId = selectedWorkspaceId ? Number(selectedWorkspaceId) : null;
    const allowedModules = selectedModules.length === 0 ? ["*"] : selectedModules;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          expiresInDays,
          workspaceId,
          allowedModules,
          scope,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create API key.");
      }

      const data = await res.json();
      const rawKey = data?.data?.rawKey || data?.data?.prefix || data?.rawKey || "aksora_xxx";
      setCreatedRawKey(rawKey);
      setIsCreateOpen(false);
      setKeyName("");
      setExpiresInDaysOption("no_expiration");
      setSelectedModules(["*"]);
      setScope("write");
      toast("API key created successfully", "success");
      fetchKeys();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      const res = await fetch(`/api/settings/api-keys?id=${encodeURIComponent(revokeTarget.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: revokeTarget.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke API key.");
      }

      toast("API key revoked", "success");
      fetchKeys();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to revoke API key", "error");
    } finally {
      setRevokeLoading(false);
      setRevokeTarget(null);
    }
  };

  const copyToClipboard = (text: string, type: "rawKey" | "snippet", snippetKey?: string) => {
    navigator.clipboard.writeText(text);
    if (type === "rawKey") {
      setCopiedRawKey(true);
      setTimeout(() => setCopiedRawKey(false), 2000);
    } else if (snippetKey) {
      setCopiedSnippet(snippetKey);
      setTimeout(() => setCopiedSnippet(null), 2000);
    }
    toast("Copied to clipboard", "success");
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Never used";
    try {
      return new Date(isoString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formatExpireDate = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      return new Date(isoString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const sampleCurlPost = `curl -X POST https://your-domain.com/api/public/v1/bugs \\
  -H "Authorization: Bearer aksora_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Authentication bypass flaw", "priority": "High", "severity": "critical"}'`;

  const sampleCurlGet = `curl -X GET https://your-domain.com/api/public/v1/test-cases \\
  -H "Authorization: Bearer aksora_xxxxx"`;

  return (
    <div className="w-full space-y-8">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Personal API Keys</h2>
          <p className="mt-1 text-xs text-slate-500">
            Use API keys to authenticate requests to the Aksora REST API from external tools and CI/CD pipelines.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        >
          <Plus size={15} weight="bold" />
          Create API Key
        </button>
      </div>

      {error && <InlineAlert variant="error" message={error} />}

      {/* Keys Table / List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Keys</h3>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400">
              <Key size={24} weight="bold" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">No API Keys Created</h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              You have not generated any API keys yet. Click the Create API Key button above to generate your first key.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Key Name</th>
                  <th className="px-6 py-3">Prefix</th>
                  <th className="px-6 py-3">Workspace</th>
                  <th className="px-6 py-3">Access</th>
                  <th className="px-6 py-3">Permissions</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Expires</th>
                  <th className="px-6 py-3">Last Used</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {keys.map((key) => {
                  const isRevoked = Boolean(key.revokedAt);
                  const isExpired = Boolean(key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now());
                  const wsMatch = workspaces.find((w) => w.id === key.workspaceId);
                  const wsLabel = wsMatch ? wsMatch.name : key.workspaceId ? `WS #${key.workspaceId}` : "Default";
                  const rawModules = String(key.allowedModules ?? "*").trim();
                  const isAllModules = !rawModules || rawModules === "*";
                  const moduleList = isAllModules ? [] : rawModules.split(",").map((m) => m.trim()).filter(Boolean);

                  return (
                    <tr key={key.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">{key.name}</td>
                      <td className="px-6 py-4">
                        <code className="bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-800 border border-slate-200">
                          {key.keyPrefix || "aksora_xxx"}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                          {wsLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {key.scope === "read" ? (
                          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Read-only
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Read &amp; Write
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isAllModules ? (
                          <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            All Modules (*)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {moduleList.map((m) => (
                              <span
                                key={m}
                                className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{formatDate(key.createdAt)}</td>
                      <td className="px-6 py-4 text-slate-500">{formatExpireDate(key.expiresAt)}</td>
                      <td className="px-6 py-4 text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {formatDate(key.lastUsedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isRevoked && !isExpired && (
                          <button
                            onClick={() => setRevokeTarget(key)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                          >
                            <Trash size={14} />
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage Documentation */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 text-slate-900 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Code size={20} weight="bold" className="text-blue-600" />
            <h3 className="text-sm font-bold">API Usage &amp; Authentication</h3>
          </div>
          <Link
            href="/docs/api"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
          >
            Read full API docs &rarr;
          </Link>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          Authenticate your requests by sending your API key in the <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800 rounded">Authorization</code> header using the <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800 rounded">Bearer</code> scheme.
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Create a Bug (POST)</span>
              <button
                onClick={() => copyToClipboard(sampleCurlPost, "snippet", "post")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                {copiedSnippet === "post" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copiedSnippet === "post" ? "Copied" : "Copy cURL"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3.5 text-[11px] font-mono text-slate-100 leading-relaxed">
              <code>{sampleCurlPost}</code>
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">List Test Cases (GET)</span>
              <button
                onClick={() => copyToClipboard(sampleCurlGet, "snippet", "get")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                {copiedSnippet === "get" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copiedSnippet === "get" ? "Copied" : "Copy cURL"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3.5 text-[11px] font-mono text-slate-100 leading-relaxed">
              <code>{sampleCurlGet}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Git Webhook Auto-Retest Integration */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 text-slate-900 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <GitBranch size={20} weight="bold" className="text-emerald-600" />
            <h3 className="text-sm font-bold">Bi-directional Git Webhook Integration</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            Active Endpoint
          </span>
        </div>

        <p className="text-xs leading-relaxed text-slate-600">
          Connect your GitHub or GitLab repository to automatically transition defect tickets to{" "}
          <strong className="text-slate-900 font-semibold">&ldquo;Ready to Retest&rdquo;</strong> and sync task branches when developers push commits or merge pull requests.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
            <span className="font-bold text-slate-800">Payload URL:</span>
            <div className="flex items-center justify-between rounded-md bg-white border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-slate-700">
              <code>/api/webhooks/git</code>
              <button
                type="button"
                onClick={() => copyToClipboard(`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/git`, "snippet", "webhook")}
                className="text-blue-600 hover:text-blue-800 transition"
              >
                {copiedSnippet === "webhook" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Supported events: <strong>Push</strong>, <strong>Pull Request</strong>, and <strong>Merge Request</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
            <span className="font-bold text-slate-800">Commit &amp; PR Syntax:</span>
            <ul className="space-y-1 text-[11px] text-slate-600">
              <li>
                <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono font-semibold text-rose-700">[BUG-12]</code> or <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono font-semibold text-rose-700">bug-12</code> &rarr; Transitions to <em>Ready to Retest</em>
              </li>
              <li>
                <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono font-semibold text-blue-700">[TASK-45]</code> or <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono font-semibold text-blue-700">#45</code> &rarr; Sets branch SHA and transitions to <em>Done</em> on merge
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      <ModalShell
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New API Key"
        description="Generate a personal access token for REST API integrations."
        icon={<Key size={20} weight="bold" />}
        maxWidth="lg"
      >
        {createError && <InlineAlert variant="error" message={createError} className="mb-4" />}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Key Name / Label <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CI Pipeline, GitHub Actions, SnapTest"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Give this key a descriptive name to identify where it is used.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {workspaces.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Workspace Scope
                </label>
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={String(ws.id)}>
                      {ws.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Isolated to this workspace.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Expiration
              </label>
              <select
                value={expiresInDaysOption}
                onChange={(e) => setExpiresInDaysOption(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="no_expiration">No expiration</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Auto-expires after duration.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Access Level
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScope("write")}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  scope === "write"
                    ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/10 text-blue-900 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <PencilSimpleLine size={14} weight="bold" className={scope === "write" ? "text-blue-600" : "text-slate-400"} />
                    <span className="text-xs font-bold">Read &amp; Write</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${scope === "write" ? "bg-blue-600" : "bg-slate-300"}`} />
                </div>
                <span className="mt-1 text-[11px] text-slate-500 leading-snug">Full access to query and mutate data</span>
              </button>

              <button
                type="button"
                onClick={() => setScope("read")}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  scope === "read"
                    ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/10 text-blue-900 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <Eye size={14} weight="bold" className={scope === "read" ? "text-blue-600" : "text-slate-400"} />
                    <span className="text-xs font-bold">Read-only</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${scope === "read" ? "bg-blue-600" : "bg-slate-300"}`} />
                </div>
                <span className="mt-1 text-[11px] text-slate-500 leading-snug">GET requests only (POST/DELETE rejected)</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Module Permissions
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllModules}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition"
                >
                  Select All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllModules}
                  className="font-semibold text-slate-500 hover:text-slate-700 transition"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 max-h-44 overflow-y-auto">
              {AVAILABLE_MODULES.map((m) => {
                const checked = isModuleChecked(m.key);
                return (
                  <label
                    key={m.key}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer text-xs font-medium transition select-none ${
                      checked
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleModule(m.key)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span>{m.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Select which modules this key is allowed to query and modify.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 mt-5">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading || !keyName.trim()}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-50"
            >
              {createLoading ? "Generating..." : "Generate Key"}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* One-Time Raw Key Reveal Modal */}
      <ModalShell
        isOpen={Boolean(createdRawKey)}
        onClose={() => setCreatedRawKey(null)}
        title="Your New API Key"
        description="Copy and store your secret key securely."
        icon={<ShieldCheck size={20} weight="bold" className="text-emerald-600" />}
        maxWidth="lg"
        closeOnBackdrop={false}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold mb-1">
              <Warning size={16} className="text-amber-600" weight="bold" />
              Save this key now!
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              This is the <strong>only time</strong> your API key will be displayed. It cannot be recovered after you close this window.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              API Key Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdRawKey || ""}
                className="flex-1 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-bold text-slate-900 outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(createdRawKey || "", "rawKey")}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition shrink-0"
              >
                {copiedRawKey ? <Check size={15} weight="bold" /> : <Copy size={15} weight="bold" />}
                {copiedRawKey ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setCreatedRawKey(null)}
              className="h-9 rounded-lg bg-slate-900 px-5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              I have saved this key
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Revoke Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(revokeTarget)}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${revokeTarget?.name}"? Any applications using prefix (${revokeTarget?.keyPrefix}) will immediately lose access.`}
        confirmText={revokeLoading ? "Revoking..." : "Yes, Revoke Key"}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
